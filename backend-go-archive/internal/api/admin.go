package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/polkadot"
)

// AdminHandler handles admin API endpoints
type AdminHandler struct {
	polkadotClient *polkadot.Client
	eventRepo      *database.EventRepository
	nftRepo        *database.NFTRepository
	userRepo       *database.UserRepository
	permRepo       *database.PermissionRepository
}

// NewAdminHandler creates a new admin API handler
func NewAdminHandler(
	polkadotClient *polkadot.Client,
	eventRepo *database.EventRepository,
	nftRepo *database.NFTRepository,
	userRepo *database.UserRepository,
	permRepo *database.PermissionRepository,
) *AdminHandler {
	return &AdminHandler{
		polkadotClient: polkadotClient,
		eventRepo:      eventRepo,
		nftRepo:        nftRepo,
		userRepo:       userRepo,
		permRepo:       permRepo,
	}
}

// EventRequest represents a request to create an event
type EventRequest struct {
	Name     string `json:"name" binding:"required,min=3,max=100"`
	Date     string `json:"date" binding:"required"`
	Location string `json:"location" binding:"required,min=2,max=100"`
	Organizer string `json:"organizer"`
}

// validateDate checks if a date string is valid
func validateDate(date string) bool {
	_, err := time.Parse("2006-01-02", date)
	return err == nil
}

// CreateEvent creates a new event
func (h *AdminHandler) CreateEvent(c *gin.Context) {
	var req EventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Additional validation
	if !validateDate(req.Date) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Location) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and location cannot be empty or just whitespace"})
		return
	}

	// Get wallet address from request or use a default
	organizer := req.Organizer
	if organizer == "" {
		// For testing, use a default address
		organizer = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
	}

	// Create event in database
	event := &models.Event{
		Name:      req.Name,
		Date:      req.Date,
		Location:  req.Location,
		Organizer: organizer,
	}

	if err := h.eventRepo.Create(event); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	eventID, err := h.polkadotClient.CreateEvent(req.Name, req.Date, req.Location)
if err != nil {
	c.Error(err)
} else {
	// Optional: log or store the blockchain ID
	// You could store this later if you add a BlockchainEventID field
	c.Set("blockchain_event_id", eventID)
}



	// Get or create the organizer user
	user, err := h.userRepo.GetOrCreate(organizer)
	if err != nil {
		// Log the error but continue
		c.Error(err)
	} else {
		// Give the user owner permissions for the event
		perm := &database.EventPermission{
			EventID: event.ID,
			UserID:  user.ID,
			Role:    database.RoleOwner,
		}
		if err := h.permRepo.Create(perm); err != nil {
			// Log the error but continue
			c.Error(err)
		}
	}

	c.JSON(http.StatusOK, event)
}

// ListEvents lists all events
func (h *AdminHandler) ListEvents(c *gin.Context) {
	events, err := h.eventRepo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, events)
}

// GetEvent gets an event by ID
// GetEvent gets an event by ID
func (h *AdminHandler) GetEvent(c *gin.Context) {
	idStr := c.Param("id")

	event, err := h.eventRepo.GetByID(idStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if event == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	c.JSON(http.StatusOK, event)
}

// ListNFTs lists all NFTs
func (h *AdminHandler) ListNFTs(c *gin.Context) {
	nfts, err := h.nftRepo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, nfts)
}