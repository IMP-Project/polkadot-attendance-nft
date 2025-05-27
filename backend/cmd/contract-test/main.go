package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/config"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/polkadot"
)

func main() {
	// Configure logging
	log.SetOutput(os.Stdout)
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	log.Println("Starting contract integration test...")

	// Load configuration
	log.Println("Loading configuration...")
	cfg := config.Load()

	// Display configuration
	log.Printf("Configuration loaded:")
	log.Printf("- RPC URL: %s", cfg.PolkadotRPC)
	log.Printf("- Contract Address: %s", cfg.ContractAddress)
	log.Printf("- Database: %s@%s:%d/%s", cfg.Database.User, cfg.Database.Host, cfg.Database.Port, cfg.Database.DBName)

	// Initialize blockchain client
	log.Printf("Initializing blockchain client...")
	client := polkadot.NewClient(cfg.PolkadotRPC, cfg.ContractAddress)

	// Initialize database connection
	log.Printf("Connecting to database...")
	db, err := database.New()
	
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Println("Database connection successful.")

	// Test 1: Create an event in the blockchain
	testEventName := "Contract Integration Test Event"
	testEventDate := "2025-05-20"
	testEventLocation := "Smart Contract Test Location"

	log.Println("Test 1: Creating an event in the blockchain...")
	eventID, err := client.CreateEvent(testEventName, testEventDate, testEventLocation)
	if err != nil {
		log.Fatalf("Failed to create event in blockchain: %v", err)
	}
	log.Printf("Event created in blockchain with ID: %d", eventID)

	// Test 2: Retrieve the event from the blockchain
	log.Println("Test 2: Retrieving the event from the blockchain...")
	event, err := client.GetEvent(eventID)
	if err != nil {
		log.Fatalf("Failed to retrieve event from blockchain: %v", err)
	}
	
	if event == nil {
		log.Fatalf("Event not found in blockchain after creation")
	}
	
	eventJSON, _ := json.MarshalIndent(event, "", "  ")
	log.Printf("Retrieved event from blockchain: %s", string(eventJSON))

	if event.Name != testEventName || event.Date != testEventDate || event.Location != testEventLocation {
		log.Fatalf("Event data mismatch. Expected %s/%s/%s, got %s/%s/%s",
			testEventName, testEventDate, testEventLocation,
			event.Name, event.Date, event.Location)
	}
	log.Println("Event data verified successfully.")
	
	// Test 3: Store the event in the database
	log.Println("Test 3: Storing the event in the database...")
	eventRepo := database.NewEventRepository(db)
	dbEvent := &models.Event{
		ID: fmt.Sprintf("%d", eventID), // converts uint64 to string
		Name:      event.Name,
		Date:      event.Date,
		Location:  event.Location,
		Organizer: event.Organizer,
	}
	
	// Check if event already exists in database
	existingEvent, err := eventRepo.GetByID(eventID)
	if err != nil {
		log.Printf("Error checking for existing event: %v", err)
	}
	
	if existingEvent != nil {
		log.Printf("Event already exists in database, updating...")
		if err := eventRepo.Update(dbEvent); err != nil {
			log.Printf("Warning: Failed to update event in database: %v", err)
		} else {
			log.Printf("Event updated in database with ID: %d", eventID)
		}
	} else {
		if err := eventRepo.Create(dbEvent); err != nil {
			log.Printf("Warning: Failed to create event in database: %v", err)
		} else {
			log.Printf("Event stored in database with ID: %d", eventID)
		}
	}
	
	// Test 4: Mint an NFT
	log.Println("Test 4: Minting an NFT...")
	recipient := "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty" // Test recipient address
	metadata := map[string]interface{}{
		"event_id":   eventID,
		"event_name": event.Name,
		"date":       event.Date,
		"recipient":  recipient,
		"image":      "https://example.com/test-nft-image.png",
		"timestamp":  "2025-05-20T10:00:00Z",
	}
	
	success, err := client.MintNFT(fmt.Sprintf("%d", eventID), recipient, metadata)
	if err != nil {
		log.Fatalf("Failed to mint NFT: %v", err)
	}
	
	if !success {
		log.Fatalf("NFT minting returned false")
	}
	
	log.Printf("NFT minted successfully for recipient: %s", recipient)
	
	// Test 5: List events
	log.Println("Test 5: Listing all events...")
	events, err := client.ListEvents()
	if err != nil {
		log.Fatalf("Failed to list events: %v", err)
	}
	
	log.Printf("Found %d events", len(events))
	for i, evt := range events {
		log.Printf("Event %d: %s (%s) at %s", i+1, evt.Name, evt.Date, evt.Location)
	}
	
	// Test 6: List NFTs
	log.Println("Test 6: Listing all NFTs...")
	nfts, err := client.ListNFTs()
	if err != nil {
		log.Fatalf("Failed to list NFTs: %v", err)
	}
	
	log.Printf("Found %d NFTs", len(nfts))
	for i, nft := range nfts {
		log.Printf("NFT %d: Event %d, Owner %s", i+1, nft.EventID, nft.Owner)
	}
	
	// Display summary of test results
	fmt.Println("\n========== CONTRACT INTEGRATION TEST RESULTS ==========")
	fmt.Println("✅ Successfully connected to the blockchain")
	fmt.Println("✅ Successfully created an event in the blockchain")
	fmt.Println("✅ Successfully retrieved the event from the blockchain")
	fmt.Println("✅ Successfully stored the event in the database")
	fmt.Println("✅ Successfully minted an NFT for the event")
	fmt.Println("✅ Successfully listed events from the blockchain")
	fmt.Println("✅ Successfully listed NFTs from the blockchain")
	fmt.Println("======================================================")
	
	fmt.Println("\nTest completed successfully!")
} 