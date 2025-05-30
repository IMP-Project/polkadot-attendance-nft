package main

import (
	"fmt"
	"log"
	"os"

	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/config"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load configuration
	cfg := config.Load()

	log.Printf("Connecting to database at %s:%d...", cfg.Database.Host, cfg.Database.Port)

	// Create GORM database connection
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable",
		cfg.Database.Host,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName, // Changed from Name to DBName
		cfg.Database.Port,
	)

	gormDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connection successful.")

	// Run GORM auto-migrations
	log.Println("Running database migrations...")
	err = gormDB.AutoMigrate(
		&database.User{},
		&database.EventPermission{},
		&models.Event{},
		// Add other models here as needed
	)
	if err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	log.Println("Migrations completed successfully. Database is ready!")

	// Initialize repositories for testing
	// eventRepo := database.NewEventRepository(gormDB) // Comment out until updated
	// _ = database.NewNFTRepository(gormDB) // Comment out until updated
	userRepo := database.NewUserRepository(gormDB)
	_ = database.NewPermissionRepository(gormDB) // Comment out until needed

	// Test repositories by creating a test user
	testUser := &database.User{
		WalletAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", // Test address
	}

	if err := userRepo.Create(testUser); err != nil {
		log.Fatalf("Failed to create test user: %v", err)
	}
	log.Printf("Created test user with ID: %d", testUser.ID)

	// Verify user created
	fetchedUser, err := userRepo.GetByWalletAddress(testUser.WalletAddress)
	if err != nil {
		log.Fatalf("Failed to fetch test user: %v", err)
	}
	if fetchedUser == nil {
		log.Fatalf("Test user not found")
	}
	log.Printf("Verified user retrieval by wallet address")

	// Test event (commented out until eventRepo is updated)
	/*
	testEvent := &models.Event{
		Name:      "Test Event",
		Date:      "2025-05-01",
		Location:  "Test Location",
		Organizer: testUser.WalletAddress,
	}

	if err := eventRepo.Create(testEvent); err != nil {
		log.Fatalf("Failed to create test event: %v", err)
	}
	log.Printf("Created test event with ID: %d", testEvent.ID)

	// Create permission
	perm := &database.EventPermission{
		EventID: fmt.Sprintf("%d", testEvent.ID), // Convert to string since EventID is string
		UserID:  testUser.ID,
		Role:    database.RoleOwner,
	}
	if err := permRepo.Create(perm); err != nil {
		log.Fatalf("Failed to create permission: %v", err)
	}
	log.Printf("Created test permission")

	// Clean up test data
	log.Println("Cleaning up test data...")
	if err := permRepo.Delete(testUser.ID, fmt.Sprintf("%d", testEvent.ID)); err != nil {
		log.Printf("Warning: Failed to delete test permission: %v", err)
	}
	*/

	fmt.Println("\n✅ Database is properly set up and working!\n")
	os.Exit(0)
}