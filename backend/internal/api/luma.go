package api

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"
	"strconv"
	"github.com/gin-gonic/gin"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/luma"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/polkadot"
)

// LumaHandler handles Luma webhook API endpoints
type LumaHandler struct {
	lumaClient     *luma.Client
	polkadotClient *polkadot.Client
	nftRepo        *database.NFTRepository
	eventRepo      *database.EventRepository
	userRepo       *database.UserRepository
}

// NewLumaHandler creates a new Luma webhook handler
func NewLumaHandler(
	lumaClient *luma.Client,
	polkadotClient *polkadot.Client,
	nftRepo *database.NFTRepository,
	eventRepo *database.EventRepository,
	userRepo *database.UserRepository,
) *LumaHandler {
	return &LumaHandler{
		lumaClient:     lumaClient,
		polkadotClient: polkadotClient,
		nftRepo:        nftRepo,
		eventRepo:      eventRepo,
		userRepo:       userRepo,
	}
}

// CheckInWebhook handles check-in webhook from Luma
func (h *LumaHandler) CheckInWebhook(c *gin.Context) {
	// Parse webhook payload
	var checkIn models.CheckInEvent
	if err := c.ShouldBindJSON(&checkIn); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Get attendee details from Luma
	attendee, err := h.lumaClient.GetAttendee(checkIn.AttendeeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get attendee: %v", err)})
		return
	}

	// Get event details from Luma
	eventDetails, err := h.lumaClient.GetEvent(checkIn.EventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get event: %v", err)})
		return
	}

	// Validate wallet address
	if attendee.WalletAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Attendee has no wallet address"})
		return
	}

	// Create NFT metadata
	metadata := map[string]interface{}{
		"name":        fmt.Sprintf("Attendance: %s", eventDetails.Name),
		"description": fmt.Sprintf("Proof of attendance for %s", eventDetails.Name),
		"event_name":  eventDetails.Name,
		"event_date":  eventDetails.Date,
		"location":    eventDetails.Location,
		"attendee":    attendee.Name,
		"timestamp":   time.Now().Format(time.RFC3339),
	}

	// First, store in database
	nft := &models.NFT{
		EventID:  eventDetails.ID,
		Owner:    attendee.WalletAddress,
		Metadata: metadata,
	}

	if err := h.nftRepo.Create(nft); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create NFT in database: %v", err)})
		return
	}

	// Get or create the user
	_, err = h.userRepo.GetOrCreate(attendee.WalletAddress)
	if err != nil {
		// Log error but continue
		c.Error(err)
	}

	// Mint NFT on blockchain
	success, err := h.polkadotClient.MintNFT(eventDetails.ID, attendee.WalletAddress, metadata)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to mint NFT: %v", err)})
		return
	}

	if !success {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mint NFT on blockchain"})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"nft_id":  nft.ID,
		"message": fmt.Sprintf("Successfully minted NFT for %s at %s", attendee.Name, eventDetails.Name),
	})
}

// ValidateSignature validates the Luma webhook signature
func (h *LumaHandler) ValidateSignature(c *gin.Context, webhookKey string) bool {
	// Skip signature validation in development mode if no webhook key is provided
	if webhookKey == "" {
		return true
	}

	signature := c.GetHeader("X-Luma-Signature")
	if signature == "" {
		return false
	}

	// Read request body
	body, err := ioutil.ReadAll(c.Request.Body)
	if err != nil {
		return false
	}

	// Restore body for later use
	c.Request.Body = ioutil.NopCloser(bytes.NewBuffer(body))

	// Compute HMAC
	mac := hmac.New(sha256.New, []byte(webhookKey))
	mac.Write(body)
	expectedMAC := mac.Sum(nil)
	expectedSignature := hex.EncodeToString(expectedMAC)

	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

func (h *LumaHandler) ImportSingleEvent(c *gin.Context) {
	var request struct {
		APIKey  string `json:"apiKey"`
		EventID string `json:"eventId"`
	}

	if err := c.ShouldBindJSON(&request); err != nil || request.APIKey == "" || request.EventID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "API key and Event ID are required"})
		return
	}

	// Test API key first
	fmt.Printf("Testing API key for user authentication...\n")
	if err := h.lumaClient.TestAPIKey(request.APIKey); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "API key test failed", "details": err.Error()})
		return
	}

	// List events to see the correct format
	fmt.Printf("Listing events to find correct API IDs...\n")
	if _, err := h.lumaClient.ListEvents(request.APIKey); err != nil {
	fmt.Printf("Failed to list events: %v\n", err)
}

	event, err := h.lumaClient.FetchSingleEvent(request.APIKey, request.EventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event from Luma", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"event": event})
}

// ListUserEvents returns all events for the authenticated user
func (h *LumaHandler) ListUserEvents(c *gin.Context) {
	var request struct {
		APIKey string `json:"apiKey"`
	}

	if err := c.ShouldBindJSON(&request); err != nil || request.APIKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "API key is required"})
		return
	}

	// Test API key first
	if err := h.lumaClient.TestAPIKey(request.APIKey); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid API key", "details": err.Error()})
		return
	}

	// List all events
	events, err := h.lumaClient.ListEvents(request.APIKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}

// BulkImportEvents imports all events from Luma for the authenticated user
func (h *LumaHandler) BulkImportEvents(c *gin.Context) {
	var request struct {
		APIKey string `json:"apiKey"`
		UserID string `json:"userId"` // Changed to string to match frontend
	}

	fmt.Printf("BulkImportEvents called\n")
	
	if err := c.ShouldBindJSON(&request); err != nil {
		fmt.Printf("JSON binding failed: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
		return
	}
	
	fmt.Printf("Parsed APIKey: '%s' (length: %d)\n", request.APIKey, len(request.APIKey))
	fmt.Printf("Parsed UserID: '%s'\n", request.UserID)
	
	if request.APIKey == "" {
		fmt.Printf("API key is empty after parsing\n")
		c.JSON(http.StatusBadRequest, gin.H{"error": "API key is required"})
		return
	}

	// Test API key first
	if err := h.lumaClient.TestAPIKey(request.APIKey); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid API key", "details": err.Error()})
		return
	}

	// Save the API key for the user
	if request.UserID != "" {
		userID, err := strconv.ParseUint(request.UserID, 10, 64)
		if err == nil {
			if err := h.userRepo.UpdateLumaApiKey(userID, request.APIKey); err != nil {
				fmt.Printf("Failed to save API key for user %d: %v\n", userID, err)
				// Continue with import even if API key save fails
			} else {
				fmt.Printf("Saved API key for user %d\n", userID)
			}
		}
	}

// Get the importing user's wallet address
var importingUserWallet string
if request.UserID != "" {
    fmt.Printf("DEBUG: Looking up user ID: %s\n", request.UserID)
    userID, err := strconv.ParseUint(request.UserID, 10, 64)
    if err == nil {
        fmt.Printf("DEBUG: Parsed user ID: %d\n", userID)
        user, err := h.userRepo.GetByID(userID)
        if err == nil && user != nil {
            importingUserWallet = user.WalletAddress
            fmt.Printf("DEBUG: Found wallet address: %s\n", importingUserWallet)
        } else {
            fmt.Printf("DEBUG: Failed to get user or user is nil. Error: %v\n", err)
        }
    } else {
        fmt.Printf("DEBUG: Failed to parse user ID: %v\n", err)
    }
}

// Fallback if no wallet address found
if importingUserWallet == "" {
    fmt.Printf("Warning: Could not find wallet address for user %s\n", request.UserID)
}

fmt.Printf("DEBUG: Final importingUserWallet value: '%s'\n", importingUserWallet)

// Fallback if no wallet address found
if importingUserWallet == "" {
    fmt.Printf("Warning: Could not find wallet address for user %s\n", request.UserID)
    // You could either skip import or use a default/placeholder
}

	// Get all events from Luma
	lumaEvents, err := h.lumaClient.ListEvents(request.APIKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events from Luma", "details": err.Error()})
		return
	}

	// Prepare response
	var importedEvents []map[string]interface{}
	var successCount int
	var errors []string

	// Import each event
	for _, lumaEvent := range lumaEvents {
		// Convert Luma event to our Event model
		event := &models.Event{
			ID:            lumaEvent["api_id"].(string),
			Name:          getStringValue(lumaEvent, "name"),
			Date:          getStringValue(lumaEvent, "start_at"),
			Location:      getLocationFromEvent(lumaEvent),
			URL:           getStringValue(lumaEvent, "url"),
			Organizer:     importingUserWallet,
			UserID:        request.UserID, // Add UserID for sync tracking
			LastSyncedAt:  time.Now(),     // Set initial sync time
			LumaUpdatedAt: getStringValue(lumaEvent, "updated_at"), // Track Luma's update time
			IsDeleted:     false,
		}

		// Save to database if repository is available
		if h.eventRepo != nil {
			if err := h.eventRepo.Create(event); err != nil {
				errors = append(errors, fmt.Sprintf("Failed to save event '%s': %v", event.Name, err))
				continue
			}
		}

		importedEvents = append(importedEvents, lumaEvent)
		successCount++
	}

	// Return results
	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"imported_count": successCount,
		"total_count":    len(lumaEvents),
		"events":         importedEvents,
		"errors":         errors,
		"message":        fmt.Sprintf("Successfully imported %d out of %d events", successCount, len(lumaEvents)),
	})
}

// Helper functions for extracting data from Luma event
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