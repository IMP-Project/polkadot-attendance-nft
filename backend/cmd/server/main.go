package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/api"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/config"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/cron"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/luma"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/polkadot"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/services"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Create GORM database connection
	var dsn string
	
	// Check if DATABASE_URL is set (for cloud deployments)
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		dsn = databaseURL
		log.Println("Using DATABASE_URL for database connection")
	} else {
		// Fall back to individual parameters
		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=%s",
			cfg.Database.Host,
			cfg.Database.User,
			cfg.Database.Password,
			cfg.Database.DBName,
			cfg.Database.Port,
			cfg.Database.SSLMode,
		)
		log.Println("Using individual database parameters")
	}

	gormDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run GORM auto-migrations
	log.Println("Running database migrations...")

	// First, ensure UserSettings table is created explicitly
	log.Println("Creating UserSettings table...")
	if err := gormDB.AutoMigrate(&database.UserSettings{}); err != nil {
		log.Printf("UserSettings migration error: %v", err)
	} else {
		log.Println("UserSettings table migration completed")
	}

	// Then run all migrations
	err = gormDB.AutoMigrate(
		&models.User{},
		&database.UserSettings{}, // Added UserSettings migration
		&database.EventPermission{},
		&models.Event{},
		&models.NFTDesign{}, // Added NFT Design model
		&database.NFT{}, // Added NFT model
		// Add other models here as needed
	)
	if err != nil {
		log.Printf("Migration warning: %v", err) // Don't crash on migration warnings
	}
	log.Println("All database migrations completed")

	// Add missing columns to events table if they don't exist
	log.Println("Checking for missing columns in events table...")
	
	// Check and add last_synced_at column
	var columnExists bool
	err = gormDB.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'events' 
			AND column_name = 'last_synced_at'
		)
	`).Scan(&columnExists).Error
	
	if err == nil && !columnExists {
		log.Println("Adding last_synced_at column to events table...")
		gormDB.Exec(`ALTER TABLE events ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP`)
	}
	
	// Check and add user_id column
	err = gormDB.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'events' 
			AND column_name = 'user_id'
		)
	`).Scan(&columnExists).Error
	
	if err == nil && !columnExists {
		log.Println("Adding user_id column to events table...")
		gormDB.Exec(`ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)`)
	}
	
	// Check and add luma_updated_at column
	err = gormDB.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'events' 
			AND column_name = 'luma_updated_at'
		)
	`).Scan(&columnExists).Error
	
	if err == nil && !columnExists {
		log.Println("Adding luma_updated_at column to events table...")
		gormDB.Exec(`ALTER TABLE events ADD COLUMN IF NOT EXISTS luma_updated_at VARCHAR(255)`)
	}
	
	// Check and add is_deleted column
	err = gormDB.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'events' 
			AND column_name = 'is_deleted'
		)
	`).Scan(&columnExists).Error
	
	if err == nil && !columnExists {
		log.Println("Adding is_deleted column to events table...")
		gormDB.Exec(`ALTER TABLE events ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`)
	}

	log.Println("Column check completed")

	// Initialize repositories
	userRepo := database.NewUserRepository(gormDB)
	permRepo := database.NewPermissionRepository(gormDB)

	// Initialize event repository with GORM
	eventRepo := database.NewEventRepository(gormDB)
	log.Println("Event repository initialized with GORM")

	// Initialize NFT repository with database connection
	// Create a new database connection for NFT repository
	nftDB, err := database.New()
	if err != nil {
		log.Fatalf("Failed to create database connection for NFT repository: %v", err)
	}
	nftRepo := database.NewNFTRepository(nftDB)
	log.Println("NFT repository initialized")
	
	// Initialize design repository
	designRepo := database.NewDesignRepository(gormDB)
	log.Println("Design repository initialized with GORM")

	log.Println("User, Permission, Event, NFT, and Design repositories initialized")

	// Initialize Luma client
	lumaClient := luma.NewClient("https://api.lu.ma/v2")

	// Initialize sync service
	syncService := services.NewSyncService(lumaClient, eventRepo, userRepo, nftRepo, client)

	// Initialize and start event sync cron job
	eventSyncCron := cron.NewEventSyncCron(syncService)
	if err := eventSyncCron.Start(); err != nil {
		log.Fatalf("Failed to start event sync cron: %v", err)
	}

	// Validate contract address
	formattedAddress := api.ValidateContractAddress(cfg.ContractAddress)

	// Initialize Polkadot client
	client := polkadot.NewClient(cfg.PolkadotRPC, formattedAddress)

	// Create and configure the router with all available repositories
	router := api.NewRouter(cfg, client, eventRepo, nftRepo, userRepo, permRepo, designRepo)

	// Create HTTP server
	srv := &http.Server{
		Addr:    cfg.ServerAddress,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server listening on %s", cfg.ServerAddress)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Set up graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Stop cron jobs
	eventSyncCron.Stop()

	// Give outstanding requests a deadline for completion
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	// Close database connection
	gormSQLDB, err := gormDB.DB()
	if err != nil {
		log.Printf("Error getting underlying DB: %v", err)
	} else {
		if err := gormSQLDB.Close(); err != nil {
			log.Printf("Error closing GORM database connection: %v", err)
		}
	}

	// Close NFT database connection
	if err := nftDB.Close(); err != nil {
		log.Printf("Error closing NFT database connection: %v", err)
	}

	log.Println("Server exited gracefully")
}