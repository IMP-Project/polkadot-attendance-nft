package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
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

	user, err := h.userRepo.FindOrCreateByWallet(req.WalletAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process login"})
		return
	}

	token, err := generateJWT(user.ID, h.JWTSecret)
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
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in token"})
		return
	}

	user, err := h.userRepo.GetByWalletAddress(userID.(string))
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
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in token"})
		return
	}

	user, err := h.userRepo.GetByWalletAddress(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	events, err := h.eventRepo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, events)
}

// GetUserNFTs gets all NFTs owned by the user
func (h *UserHandler) GetUserNFTs(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in token"})
		return
	}

	nfts, err := h.nftRepo.GetAllByOwner(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, nfts)
}
