package services

import (
	"fmt"
	"log"
	"time"
	"strings"

	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/luma"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/polkadot"
)

// SyncService handles synchronization between Luma and local database
type SyncService struct {
	lumaClient     *luma.Client
	eventRepo      *database.EventRepository
	userRepo       *database.UserRepository
	nftRepo        *database.NFTRepository
	polkadotClient *polkadot.Client
}

// NewSyncService creates a new sync service instance
func NewSyncService(
	lumaClient *luma.Client,
	eventRepo *database.EventRepository,
	userRepo *database.UserRepository,
	nftRepo *database.NFTRepository,
	polkadotClient *polkadot.Client,
) *SyncService {
	return &SyncService{
		lumaClient:     lumaClient,
		eventRepo:      eventRepo,
		userRepo:       userRepo,
		nftRepo:        nftRepo,
		polkadotClient: polkadotClient,
	}
}

// SyncResult holds the results of a sync operation
type SyncResult struct {
	Created   int
	Updated   int
	Deleted   int
	Errors    []string
	Duration  time.Duration
}

// SyncUserEvents syncs all events for a specific user with rate limiting
func (s *SyncService) SyncUserEvents(userID string, apiKey string) (*SyncResult, error) {
	startTime := time.Now()
	result := &SyncResult{
		Errors: []string{},
	}

	log.Printf("Starting sync for user %s", userID)

	// Test API key first
	if err := s.lumaClient.TestAPIKey(apiKey); err != nil {
		return nil, fmt.Errorf("invalid API key: %w", err)
	}

	// Add delay to prevent immediate API hammering
	time.Sleep(1 * time.Second)

	// Fetch all events from Luma
	lumaEvents, err := s.lumaClient.ListEvents(apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch events from Luma: %w", err)
	}

	log.Printf("Fetched %d events from Luma for user %s", len(lumaEvents), userID)

	// Get all existing events for this user from database
	existingEvents, err := s.eventRepo.GetByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing events: %w", err)
	}

	// Create a map for quick lookup
	existingEventsMap := make(map[string]*models.Event)
	for i := range existingEvents {
		existingEventsMap[existingEvents[i].ID] = &existingEvents[i]
	}

	// Track which events we've seen from Luma
	seenEventIDs := make(map[string]bool)

	// Process each Luma event with delays
	for i, lumaEvent := range lumaEvents {
		// Add delay between processing events to avoid rate limits
		if i > 0 {
			time.Sleep(500 * time.Millisecond)
		}

		eventID := getStringValue(lumaEvent, "api_id")
		if eventID == "" {
			result.Errors = append(result.Errors, "Event missing api_id")
			continue
		}

		seenEventIDs[eventID] = true

		// Check if event exists in database
		existingEvent, exists := existingEventsMap[eventID]

		if !exists {
			// Create new event
			if err := s.createEvent(lumaEvent, userID); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to create event %s: %v", eventID, err))
			} else {
				result.Created++
				log.Printf("Created new event: %s", getStringValue(lumaEvent, "name"))
			}
		} else {
			// Check if event needs update
			if s.eventNeedsUpdate(existingEvent, lumaEvent) {
				if err := s.updateEvent(existingEvent, lumaEvent); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("Failed to update event %s: %v", eventID, err))
				} else {
					result.Updated++
					log.Printf("Updated event: %s", existingEvent.Name)
				}
			}
		}
	}

	// Handle deleted events (soft delete)
	for _, existingEvent := range existingEvents {
		if !existingEvent.IsDeleted && !seenEventIDs[existingEvent.ID] {
			// Event exists in database but not in Luma - mark as deleted
			if err := s.eventRepo.SoftDelete(existingEvent.ID); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to soft delete event %s: %v", existingEvent.ID, err))
			} else {
				result.Deleted++
				log.Printf("Soft deleted event: %s", existingEvent.Name)
			}
		}
	}

	result.Duration = time.Since(startTime)
	log.Printf("Sync completed for user %s: Created=%d, Updated=%d, Deleted=%d, Duration=%v", 
		userID, result.Created, result.Updated, result.Deleted, result.Duration)

	return result, nil
}

// SyncAllUsers syncs events for all users with staggered delays
func (s *SyncService) SyncAllUsers() error {
	log.Println("Starting sync for all users")

	// Get all users with Luma API keys
	users, err := s.userRepo.GetUsersWithLumaAPIKey()
	if err != nil {
		return fmt.Errorf("failed to get users with API keys: %w", err)
	}

	log.Printf("Found %d users with Luma API keys", len(users))

	// Sync each user's events with delays between users
	for i, user := range users {
		// Add delay between users to prevent API rate limiting
		if i > 0 {
			delay := 5 * time.Second
			log.Printf("Waiting %v before syncing next user to avoid rate limits", delay)
			time.Sleep(delay)
		}

		log.Printf("Syncing user %d of %d", i+1, len(users))
		
		result, err := s.SyncUserEvents(fmt.Sprintf("%d", user.ID), user.LumaAPIKey)
		if err != nil {
			log.Printf("Error syncing user %d: %v", user.ID, err)
			continue
		}

		// Log results
		if len(result.Errors) > 0 {
			log.Printf("Sync completed with errors for user %d: %v", user.ID, result.Errors)
		}
	}

	log.Println("Sync completed for all users")
	return nil
}

// SyncEventCheckIns syncs check-ins for a specific event with enhanced debugging
func (s *SyncService) SyncEventCheckIns(eventID string, apiKey string) error {
	log.Printf("Starting check-in sync for event %s", eventID)

	// Get all guests for this event
	guests, err := s.lumaClient.GetEventGuests(apiKey, eventID)
	if err != nil {
		return fmt.Errorf("failed to get event guests: %w", err)
	}

	log.Printf("Found %d guests for event %s", len(guests), eventID)

	// If no guests found, let's debug why
	if len(guests) == 0 {
		log.Printf("DEBUG: No guests found for event %s. Possible reasons:", eventID)
		log.Printf("1. Event has no registered attendees")
		log.Printf("2. Event is private or requires approval")
		log.Printf("3. API permissions issue")
		log.Printf("4. Event ID format issue")
		return nil // Don't treat as error, just log for debugging
	}

	// Get existing NFTs for this event to avoid duplicates
	existingNFTs, err := s.nftRepo.GetAllByEventID(eventID)
	if err != nil {
		return fmt.Errorf("failed to get existing NFTs: %w", err)
	}

	// Create a map of existing NFTs by wallet address
	existingNFTMap := make(map[string]bool)
	for _, nft := range existingNFTs {
		existingNFTMap[nft.Owner] = true
	}

	// Process each guest with enhanced debugging
	checkedInCount := 0
	mintedCount := 0
	noWalletCount := 0
	
	for i, guest := range guests {
		// Log first guest structure to understand available fields
		if i == 0 {
			log.Printf("Sample guest data structure: %+v", guest)
		}
		
		// Check if guest has checked in
		checkedIn, ok := guest["checked_in_at"].(bool)
		if !ok {
			log.Printf("Guest %d: no check-in status field found", i+1)
			continue
		}
		
		if !checkedIn {
			log.Printf("Guest %d: not checked in", i+1)
			continue
		}
		
		checkedInCount++
		log.Printf("Found checked-in guest %d: %+v", i+1, guest)

		// Get wallet address from guest data using enhanced extraction
		walletAddress := s.extractWalletAddress(guest)
		
		// Get guest info for logging
		name := "Unknown"
		if n, ok := guest["name"].(string); ok {
			name = n
		}
		
		email := ""
		if e, ok := guest["email"].(string); ok {
			email = e
		}
		
		if walletAddress == "" {
			noWalletCount++
			log.Printf("Guest %s (email: %s) has checked in but no wallet address found", name, email)
			log.Printf("Guest data available fields: %v", getGuestFieldNames(guest))
			continue
		}

		// Skip if NFT already minted for this wallet
		if existingNFTMap[walletAddress] {
			log.Printf("NFT already exists for wallet %s (guest: %s)", walletAddress, name)
			continue
		}

		// Create NFT metadata
		metadata := map[string]interface{}{
			"name":        fmt.Sprintf("Attendance: %s", eventID),
			"description": fmt.Sprintf("Proof of attendance for event"),
			"event_id":    eventID,
			"attendee":    name,
			"attributes": []map[string]interface{}{
				{"trait_type": "Event ID", "value": eventID},
				{"trait_type": "Attendee", "value": name},
				{"trait_type": "Check-in Time", "value": time.Now().Format(time.RFC3339)},
			},
		}

		// Create NFT record
		nft := &models.NFT{
			EventID:  eventID,
			Owner:    walletAddress,
			Metadata: metadata,
		}

		if err := s.nftRepo.Create(nft); err != nil {
			log.Printf("Failed to create NFT for %s: %v", walletAddress, err)
			continue
		}

		// Mint NFT on blockchain
		if s.polkadotClient != nil {
			success, err := s.polkadotClient.MintNFT(eventID, walletAddress, metadata)
			if err != nil {
				log.Printf("Failed to mint NFT on blockchain for %s: %v", walletAddress, err)
				// Continue anyway - we have the database record
			} else if !success {
				log.Printf("NFT minting returned false for %s", walletAddress)
			} else {
				log.Printf("Successfully minted NFT on blockchain for %s", walletAddress)
			}
		}

		mintedCount++
		log.Printf("Created NFT for checked-in attendee: %s (wallet: %s)", name, walletAddress)
	}

	// Enhanced logging summary
	log.Printf("Check-in sync completed for event %s:", eventID)
	log.Printf("  - Total guests: %d", len(guests))
	log.Printf("  - Checked in: %d", checkedInCount)
	log.Printf("  - Missing wallet: %d", noWalletCount)
	log.Printf("  - NFTs minted: %d", mintedCount)

	return nil
}

// SyncAllCheckIns syncs check-ins for all active events with improved batching
func (s *SyncService) SyncAllCheckIns() error {
	log.Println("Starting check-in sync for all events")

	// Get all users with API keys
	users, err := s.userRepo.GetUsersWithLumaAPIKey()
	if err != nil {
		return fmt.Errorf("failed to get users with API keys: %w", err)
	}

	log.Printf("Processing check-ins for %d users", len(users))

	// For each user, sync check-ins for their events with delays
	for userIndex, user := range users {
		if userIndex > 0 {
			delay := 3 * time.Second
			log.Printf("Waiting %v between users to avoid rate limits", delay)
			time.Sleep(delay)
		}

		// Get user's active events
		events, err := s.eventRepo.GetActiveByUserID(fmt.Sprintf("%d", user.ID))
		if err != nil {
			log.Printf("Failed to get events for user %d: %v", user.ID, err)
			continue
		}

		log.Printf("User %d has %d active events", user.ID, len(events))

		// Sync check-ins for each event with delays
		for eventIndex, event := range events {
			if eventIndex > 0 {
				delay := 2 * time.Second
				log.Printf("Waiting %v between events to avoid rate limits", delay)
				time.Sleep(delay)
			}

			if err := s.SyncEventCheckIns(event.ID, user.LumaAPIKey); err != nil {
				log.Printf("Failed to sync check-ins for event %s: %v", event.ID, err)
			}
		}
	}

	log.Println("Check-in sync completed for all events")
	return nil
}

// extractWalletAddress extracts wallet address from guest data with multiple strategies
func (s *SyncService) extractWalletAddress(guest map[string]interface{}) string {
	// Strategy 1: Check custom_data field
	if customData, ok := guest["custom_data"].(map[string]interface{}); ok {
		walletFields := []string{"wallet_address", "polkadot_wallet", "wallet", "dot_wallet"}
		for _, field := range walletFields {
			if wallet, ok := customData[field].(string); ok && wallet != "" {
				return wallet
			}
		}
	}
	
	// Strategy 2: Check answers/form responses
	if answers, ok := guest["registration_answers"].([]interface{}); ok {
		for _, answer := range answers {
			if answerMap, ok := answer.(map[string]interface{}); ok {
				if question, ok := answerMap["question"].(string); ok {
					// Look for wallet-related questions (case insensitive)
					walletQuestions := []string{
						"Wallet Address", "Polkadot Wallet", "Wallet", 
						"DOT Wallet Address", "wallet address", "polkadot wallet",
						"Substrate Wallet", "Kusama Wallet", "DOT Address",
					}
					
					for _, wq := range walletQuestions {
						if strings.EqualFold(question, wq) {
							if value, ok := answerMap["value"].(string); ok && value != "" {
								return value
							}
						}
					}
				}
			}
		}
	}
	
	// Strategy 3: Check direct fields on guest object
	walletFields := []string{"wallet_address", "polkadot_wallet", "wallet", "dot_wallet", "substrate_wallet"}
	for _, field := range walletFields {
		if wallet, ok := guest[field].(string); ok && wallet != "" {
			return wallet
		}
	}
	
	return ""
}

// getGuestFieldNames returns all available field names in a guest object for debugging
func getGuestFieldNames(guest map[string]interface{}) []string {
	var fields []string
	for key := range guest {
		fields = append(fields, key)
	}
	return fields
}

// createEvent creates a new event from Luma data
func (s *SyncService) createEvent(lumaEvent map[string]interface{}, userID string) error {
	event := &models.Event{
		ID:            getStringValue(lumaEvent, "api_id"),
		Name:          getStringValue(lumaEvent, "name"),
		Date:          getStringValue(lumaEvent, "start_at"),
		Location:      getLocationFromEvent(lumaEvent),
		URL:           getStringValue(lumaEvent, "url"),
		Organizer:     userID,
		UserID:        userID,
		LumaUpdatedAt: getStringValue(lumaEvent, "updated_at"),
		LastSyncedAt:  time.Now(),
		IsDeleted:     false,
	}

	return s.eventRepo.Create(event)
}

// updateEvent updates an existing event with Luma data
func (s *SyncService) updateEvent(existingEvent *models.Event, lumaEvent map[string]interface{}) error {
	existingEvent.Name = getStringValue(lumaEvent, "name")
	existingEvent.Date = getStringValue(lumaEvent, "start_at")
	existingEvent.Location = getLocationFromEvent(lumaEvent)
	existingEvent.URL = getStringValue(lumaEvent, "url")
	existingEvent.LumaUpdatedAt = getStringValue(lumaEvent, "updated_at")
	existingEvent.LastSyncedAt = time.Now()

	return s.eventRepo.Update(existingEvent)
}

// eventNeedsUpdate checks if an event needs to be updated
func (s *SyncService) eventNeedsUpdate(existingEvent *models.Event, lumaEvent map[string]interface{}) bool {
	// Compare updated_at timestamps
	lumaUpdatedAt := getStringValue(lumaEvent, "updated_at")
	if lumaUpdatedAt != existingEvent.LumaUpdatedAt {
		return true
	}

	// Also check key fields in case updated_at is not reliable
	if existingEvent.Name != getStringValue(lumaEvent, "name") ||
		existingEvent.Date != getStringValue(lumaEvent, "start_at") ||
		existingEvent.Location != getLocationFromEvent(lumaEvent) ||
		existingEvent.URL != getStringValue(lumaEvent, "url") {
		return true
	}

	return false
}

// Helper functions
func getStringValue(event map[string]interface{}, key string) string {
	if val, ok := event[key]; ok && val != nil {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

func getLocationFromEvent(event map[string]interface{}) string {
	// Try to get location from geo_address_json first
	if geoAddr, ok := event["geo_address_json"].(map[string]interface{}); ok && geoAddr != nil {
		if address, ok := geoAddr["address"].(string); ok && address != "" {
			return address
		}
	}
	
	// Fallback to timezone
	if timezone := getStringValue(event, "timezone"); timezone != "" {
		return timezone
	}
	
	return "Online"
}