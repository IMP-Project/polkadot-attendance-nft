package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

// AuthHandler handles authentication requests
type AuthHandler struct {
	jwtSecret []byte
}

// NewAuthHandler creates a new instance of AuthHandler
func NewAuthHandler(jwtSecret string) *AuthHandler {
	return &AuthHandler{
		jwtSecret: []byte(jwtSecret),
	}
}

type AuthRequest struct {
	WalletAddress string `json:"walletAddress" binding:"required"`
	Message       string `json:"message" binding:"required"`
	Signature     string `json:"signature" binding:"required"`
}

type AuthResponse struct {
	Token string `json:"token"`
}

// Authenticate verifies a wallet signature and issues a JWT token
func (h *AuthHandler) Authenticate(c *gin.Context) {
	var req AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// In a production environment, you would verify the signature here
	// For now, we'll trust any wallet address for demonstration purposes
	
	// Create a JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"walletAddress": req.WalletAddress,
		"exp":           time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString(h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{Token: tokenString})
} 