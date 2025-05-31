package api

import (
    "fmt"
    "net/http"
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
    "github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
    "github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
    "github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/polkadot"
)

// UserHandler handles user-related API endpoints
type UserHandler struct {
    polkadotClient *polkadot.Client
    eventRepo      *database.EventRepository
    nftRepo        *database.NFTRepository
    userRepo       *database.UserRepository
    JWTSecret      string
}

// NewUserHandler creates a new user API handler
func NewUserHandler(
    polkadotClient *polkadot.Client,
    eventRepo *database.EventRepository,
    nftRepo *database.NFTRepository,
    userRepo *database.UserRepository,
    jwtSecret string,
) *UserHandler {
    return &UserHandler{
        polkadotClient: polkadotClient,
        eventRepo:      eventRepo,
        nftRepo:        nftRepo,
        userRepo:       userRepo,
        JWTSecret:      jwtSecret,
    }
}

// Helper function to get user ID from JWT context
func (h *UserHandler) getUserIDFromContext(c *gin.Context) (uint64, error) {
    userIDStr, exists := c.Get("user_id")
    if !exists {
        return 0, fmt.Errorf("user not found in token")
    }
    
    // Convert string to uint64
    userID, err := strconv.ParseUint(userIDStr.(string), 10, 64)
    if err != nil {
        return 0, fmt.Errorf("invalid user ID format")
    }
    
    return userID, nil
}

// WalletLogin handles login by Polkadot wallet address
func (h *UserHandler) WalletLogin(c *gin.Context) {
    type LoginRequest struct {
        WalletAddress string `json:"wallet_address"`
    }

    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil || req.WalletAddress == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid wallet address"})
        return
    }

    user, err := h.userRepo.GetOrCreate(req.WalletAddress)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process login"})
        return
    }

    // user.ID is uint64, so convert to string for JWT
    token, err := generateJWT(strconv.FormatUint(user.ID, 10), h.JWTSecret)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Token generation failed"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "token": token,
        "user": gin.H{
            "id":             user.ID,
            "wallet_address": user.WalletAddress,
        },
    })
}

// generateJWT creates a signed JWT for the user
func generateJWT(userID string, secret string) (string, error) {
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "user_id": userID,
        "exp":     time.Now().Add(7 * 24 * time.Hour).Unix(), // 7 days
    })
    return token.SignedString([]byte(secret))
}

// GetProfile gets the user's profile information
func (h *UserHandler) GetProfile(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    user, err := h.userRepo.GetByID(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    if user == nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    if err := h.userRepo.UpdateLastLogin(user.ID); err != nil {
        c.Error(err)
    }

    c.JSON(http.StatusOK, user)
}

// GetUserEvents gets all events the user has permission for
func (h *UserHandler) GetUserEvents(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    user, err := h.userRepo.GetByID(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    if user == nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    // For now, return all events - you can add permission filtering later
    if h.eventRepo != nil {
        events, err := h.eventRepo.GetAll()
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusOK, events)
    } else {
        c.JSON(http.StatusOK, []interface{}{})
    }
}

// GetUserNFTs gets all NFTs owned by the user
func (h *UserHandler) GetUserNFTs(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    if h.nftRepo != nil {
        nfts, err := h.nftRepo.GetAllByOwner(strconv.FormatUint(userID, 10))
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusOK, nfts)
    } else {
        c.JSON(http.StatusOK, []interface{}{})
    }
}

// GetUserSettings gets the current user's settings
func (h *UserHandler) GetUserSettings(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    settings, err := h.userRepo.GetUserSettings(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user settings"})
        return
    }

    c.JSON(http.StatusOK, settings)
}

// UpdateUserSettings updates the current user's settings
func (h *UserHandler) UpdateUserSettings(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    var settings database.UserSettings
    if err := c.ShouldBindJSON(&settings); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid settings data"})
        return
    }

    // Validate profile picture size (limit to 10MB base64)
    if len(settings.ProfilePic) > 10*1024*1024 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Profile picture too large (max 10MB)"})
        return
    }

    if err := h.userRepo.UpdateUserSettings(userID, &settings); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Settings updated successfully"})
}

// CreateEvent creates a new event for the authenticated user
func (h *UserHandler) CreateEvent(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    user, err := h.userRepo.GetByID(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
        return
    }

    if user == nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    var event models.Event
    if err := c.ShouldBindJSON(&event); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event data"})
        return
    }

    // Set the organizer to the authenticated user's wallet address
    event.Organizer = user.WalletAddress

    if h.eventRepo != nil {
        if err := h.eventRepo.Create(&event); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
            return
        }
    } else {
        // Mock response when eventRepo is nil
        event.ID = strconv.FormatUint(uint64(time.Now().Unix()), 10)
    }

    c.JSON(http.StatusCreated, event)
}

// GetEvent gets a specific event by ID
func (h *UserHandler) GetEvent(c *gin.Context) {
    eventIDStr := c.Param("id")

    if h.eventRepo == nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Event repository not available"})
        return
    }

    event, err := h.eventRepo.GetByID(eventIDStr)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get event"})
        return
    }

    if event == nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
        return
    }

    c.JSON(http.StatusOK, event)
}

// UpdateEvent updates an event (only if user is the organizer)
func (h *UserHandler) UpdateEvent(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    user, err := h.userRepo.GetByID(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
        return
    }

    eventIDStr := c.Param("id")
    eventID, err := strconv.ParseUint(eventIDStr, 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
        return
    }

    if h.eventRepo != nil {
        // Check if user is the organizer
        existingEvent, err := h.eventRepo.GetByID(eventIDStr)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get event"})
            return
        }

        if existingEvent == nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
            return
        }

        if existingEvent.Organizer != user.WalletAddress {
            c.JSON(http.StatusForbidden, gin.H{"error": "Only the organizer can update this event"})
            return
        }

        var updatedEvent models.Event
        if err := c.ShouldBindJSON(&updatedEvent); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event data"})
            return
        }

        updatedEvent.ID = strconv.FormatUint(eventID, 10)
        updatedEvent.Organizer = user.WalletAddress

        if err := h.eventRepo.Update(&updatedEvent); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
            return
        }

        c.JSON(http.StatusOK, updatedEvent)
    } else {
        c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Event repository not available"})
    }
}

// DeleteEvent deletes an event (only if user is the organizer)
// DeleteEvent deletes an event (only if user is the organizer)
func (h *UserHandler) DeleteEvent(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    user, err := h.userRepo.GetByID(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
        return
    }

    eventIDStr := c.Param("id")
    if eventIDStr == "" || eventIDStr == "N/A" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
        return
    }

    if h.eventRepo == nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Event repository not available"})
        return
    }

    // Fetch event
    existingEvent, err := h.eventRepo.GetByID(eventIDStr)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get event"})
        return
    }

    if existingEvent == nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
        return
    }

    if existingEvent.Organizer != user.WalletAddress {
        c.JSON(http.StatusForbidden, gin.H{"error": "Only the organizer can delete this event"})
        return
    }

    // Delete event
    if err := h.eventRepo.Delete(eventIDStr); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully"})
}


// MintNFT mints an NFT for an event
func (h *UserHandler) MintNFT(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    eventIDStr := c.Param("id")
    eventID, err := strconv.ParseUint(eventIDStr, 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
        return
    }

    // For now, return a placeholder response
    // You'll implement the actual NFT minting logic later
    c.JSON(http.StatusOK, gin.H{
        "message":  "NFT minting initiated",
        "user_id":  userID,
        "event_id": eventID,
        "status":   "pending",
    })
}

// SaveLumaApiKey saves the Luma API key for the authenticated user
func (h *UserHandler) SaveLumaApiKey(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    type SaveApiKeyRequest struct {
        ApiKey string `json:"api_key"`
    }

    var req SaveApiKeyRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
        return
    }

    if req.ApiKey == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "API key cannot be empty"})
        return
    }

    // Save API key to database
    if err := h.userRepo.UpdateLumaApiKey(userID, req.ApiKey); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save API key"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Luma API key saved successfully"})
}

// GetLumaApiKey retrieves the Luma API key for the authenticated user
func (h *UserHandler) GetLumaApiKey(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    apiKey, err := h.userRepo.GetLumaApiKey(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get API key"})
        return
    }

    if apiKey == "" {
        c.JSON(http.StatusNotFound, gin.H{"error": "No Luma API key found"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"api_key": apiKey})
}

// DeleteLumaApiKey removes the Luma API key for the authenticated user
func (h *UserHandler) DeleteLumaApiKey(c *gin.Context) {
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    if err := h.userRepo.DeleteLumaApiKey(userID); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete API key"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Luma API key deleted successfully"})
}

