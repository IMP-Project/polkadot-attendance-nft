package services

import (
	"fmt"
	"log"
	"time"

	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/luma"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
)

// SyncService handles synchronization between Luma and local database
type SyncService struct {
	lumaClient *luma.Client
	eventRepo  *database.EventRepository
	userRepo   *database.UserRepository
}

// NewSyncService creates a new sync service instance
func NewSyncService(
	lumaClient *luma.Client,
	eventRepo *database.EventRepository,
	userRepo *database.UserRepository,
) *SyncService {
	return &SyncService{
		lumaClient: lumaClient,
		eventRepo:  eventRepo,
		userRepo:   userRepo,
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

// SyncUserEvents syncs all events for a specific user
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

	// Process each Luma event
	for _, lumaEvent := range lumaEvents {
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

// SyncAllUsers syncs events for all users with API keys
func (s *SyncService) SyncAllUsers() error {
	log.Println("Starting sync for all users")

	// Get all users with Luma API keys
	users, err := s.userRepo.GetUsersWithLumaAPIKey()
	if err != nil {
		return fmt.Errorf("failed to get users with API keys: %w", err)
	}

	log.Printf("Found %d users with Luma API keys", len(users))

	// Sync each user's events
	for _, user := range users {
		result, err := s.SyncUserEvents(fmt.Sprintf("%d", user.ID), user.LumaAPIKey)
		if err != nil {
			log.Printf("Error syncing user %s: %v", user.ID, err)
			continue
		}

		// Log results
		if len(result.Errors) > 0 {
			log.Printf("Sync completed with errors for user %s: %v", user.ID, result.Errors)
		}
	}

	log.Println("Sync completed for all users")
	return nil
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

// Helper functions (copied from luma.go)
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