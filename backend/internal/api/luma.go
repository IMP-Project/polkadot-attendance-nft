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

// ImportEvents allows external orgs to fetch their Luma events using their own API key
func (h *LumaHandler) ImportEvents(c *gin.Context) {
	var request struct {
		APIKey string `json:"api_key"`
	}

	if err := c.ShouldBindJSON(&request); err != nil || request.APIKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "API key is required"})
		return
	}

	events, err := h.lumaClient.FetchEvents(request.APIKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events from Luma", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"events": events,
	})
}
