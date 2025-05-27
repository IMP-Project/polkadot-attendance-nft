package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/api"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/config"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/polkadot"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.New()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run database migrations
	if err := db.MigrateUp(); err != nil {
		log.Fatalf("Failed to run database migrations: %v", err)
	}

	// Initialize repositories
	eventRepo := database.NewEventRepository(db)
	nftRepo := database.NewNFTRepository(db)
	userRepo := database.NewUserRepository(db)
	permRepo := database.NewPermissionRepository(db)

	// Validate contract address
	formattedAddress := api.ValidateContractAddress(cfg.ContractAddress)

	// Initialize Polkadot client
	client := polkadot.NewClient(cfg.PolkadotRPC, formattedAddress)

	// Create and configure the router
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
	if err := db.Close(); err != nil {
		log.Printf("Error closing database connection: %v", err)
	}

	log.Println("Server exited gracefully")
}