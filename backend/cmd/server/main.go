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
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/polkadot"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Create GORM database connection
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=%s",
		cfg.Database.Host,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
		cfg.Database.Port,
		cfg.Database.SSLMode, // Now uses the environment variable
	)

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
		&database.User{},
		&database.UserSettings{},     // Added UserSettings migration
		&database.EventPermission{},
		&models.Event{},
		// Add other models here as needed
	)
	if err != nil {
		log.Printf("Migration warning: %v", err) // Don't crash on migration warnings
	}
	log.Println("All database migrations completed")

	// Initialize repositories
	userRepo := database.NewUserRepository(gormDB)
	permRepo := database.NewPermissionRepository(gormDB)
	
	// Initialize event repository with GORM
	eventRepo := database.NewEventRepository(gormDB)
	log.Println("Event repository initialized with GORM")
	
	// Initialize NFT repository as nil for now (still needs GORM migration)
	var nftRepo *database.NFTRepository = nil
	
	log.Println("User, Permission, and Event repositories initialized")
	log.Println("NFT repository disabled (need GORM migration)")

	// Validate contract address
	formattedAddress := api.ValidateContractAddress(cfg.ContractAddress)

	// Initialize Polkadot client
	client := polkadot.NewClient(cfg.PolkadotRPC, formattedAddress)

	// Create and configure the router with all available repositories
	router := api.NewRouter(cfg, client, eventRepo, nftRepo, userRepo, permRepo)

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

	// Give outstanding requests a deadline for completion
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	// Close database connection
	sqlDB, err := gormDB.DB()
	if err != nil {
		log.Printf("Error getting underlying DB: %v", err)
	} else {
		if err := sqlDB.Close(); err != nil {
			log.Printf("Error closing database connection: %v", err)
		}
	}

	log.Println("Server exited gracefully")
}