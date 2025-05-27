package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/config"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/database"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/luma"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/polkadot"
)

// NewRouter creates a new gin router with configured routes
func NewRouter(
	cfg *config.Config, 
	polkadotClient *polkadot.Client,
	eventRepo *database.EventRepository,
	nftRepo *database.NFTRepository,
	userRepo *database.UserRepository,
	permRepo *database.PermissionRepository,
) *gin.Engine {
	r := gin.Default()

	// Middleware
	r.Use(CorsMiddleware())
	r.Use(RateLimiter(cfg.RateLimit.Enabled, cfg.RateLimit.RequestsPerMinute))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API routes
	api := r.Group("/api")

	// Public routes
	{
		// Initialize handlers
		lumaClient := luma.NewClient(cfg.LumaAPIKey)
		lumaHandler := NewLumaHandler(lumaClient, polkadotClient, nftRepo, eventRepo, userRepo)

		// Webhook endpoint for Luma check-ins
		api.POST("/webhook/check-in", lumaHandler.CheckInWebhook)

		api.POST("/import-luma-event", lumaHandler.ImportSingleEvent)

	}

	// Admin routes (protected)
	admin := api.Group("/admin")
	admin.Use(BasicAuthMiddleware(cfg))
	{
		// Initialize handlers
		adminHandler := NewAdminHandler(polkadotClient, eventRepo, nftRepo, userRepo, permRepo)

		// Event management
		admin.POST("/events", adminHandler.CreateEvent)
		admin.GET("/events", adminHandler.ListEvents)
		admin.GET("/events/:id", adminHandler.GetEvent)

		// NFT management
		admin.GET("/nfts", adminHandler.ListNFTs)
	}

	// User routes (protected with JWT)
	user := api.Group("/user")
	user.Use(JWTAuth(cfg.JWTSecret))
	{
		// Initialize handlers
		userHandler := NewUserHandler(polkadotClient, eventRepo, nftRepo, userRepo)

		// User profile
		user.GET("/profile", userHandler.GetProfile)
		user.GET("/events", userHandler.GetUserEvents)
		user.GET("/nfts", userHandler.GetUserNFTs)
	}

	return r
}