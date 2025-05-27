package main

import (
	"fmt"
	"log"
	"os"

	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/config"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
)

func main() {
	// Load configuration
	cfg := config.Load()

	log.Printf("Connecting to database at %s:%d...", cfg.Database.Host, cfg.Database.Port)

	// Initialize database
	db, err := database.New()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("Database connection successful.")

	// Run migrations
	log.Println("Running database migrations...")
	if err := db.MigrateUp(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	log.Println("Migrations completed successfully. Database is ready!")

	// Initialize repositories for testing
	eventRepo := database.NewEventRepository(db)
	_ = database.NewNFTRepository(db) // Using underscore to explicitly ignore the return value
	userRepo := database.NewUserRepository(db)
	permRepo := database.NewPermissionRepository(db)

	// Test repositories by creating a test event
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

	// Test event
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
		EventID: testEvent.ID,
		UserID:  testUser.ID,
		Role:    database.RoleOwner,
	}
	if err := permRepo.Create(perm); err != nil {
		log.Fatalf("Failed to create permission: %v", err)
	}
	log.Printf("Created test permission")

	// Clean up test data
	log.Println("Cleaning up test data...")
	if err := permRepo.Delete(testUser.ID, testEvent.ID); err != nil {
		log.Printf("Warning: Failed to delete test permission: %v", err)
	}

	fmt.Println("\n✅ Database is properly set up and working!\n")
	os.Exit(0)
}
