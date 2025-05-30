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

	// Initialize shared handlers
	lumaClient := luma.NewClient(cfg.LumaAPIKey)
	lumaHandler := NewLumaHandler(lumaClient, polkadotClient, nftRepo, eventRepo, userRepo)
	userHandler := NewUserHandler(polkadotClient, eventRepo, nftRepo, userRepo, cfg.JWTSecret)

	// Public routes
	{
		// Wallet login route
		api.POST("/login", userHandler.WalletLogin)

		// Webhook and Luma integration
		api.POST("/webhook/check-in", lumaHandler.CheckInWebhook)
		api.POST("/import-luma-event", lumaHandler.ImportSingleEvent)
		api.POST("/list-luma-events", lumaHandler.ListUserEvents)
	}

	// Admin routes (protected with basic auth)
	admin := api.Group("/admin")
	admin.Use(BasicAuthMiddleware(cfg))
	{
		adminHandler := NewAdminHandler(polkadotClient, eventRepo, nftRepo, userRepo, permRepo)

		// Admin-only event management (for admin dashboard)
		admin.POST("/events", adminHandler.CreateEvent)
		admin.GET("/events", adminHandler.ListEvents)
		admin.GET("/events/:id", adminHandler.GetEvent)

		// Admin-only NFT management
		admin.GET("/nfts", adminHandler.ListNFTs)
	}

	// User routes (protected with JWT)
	user := api.Group("/user")
	user.Use(JWTAuth(cfg.JWTSecret))
	{
		// Profile routes
		user.GET("/profile", userHandler.GetProfile)
		user.GET("/events", userHandler.GetUserEvents)
		user.GET("/nfts", userHandler.GetUserNFTs)
		
		// User settings routes
		user.GET("/settings", userHandler.GetUserSettings)
		user.PUT("/settings", userHandler.UpdateUserSettings)
		
		 // Luma API key management routes 
   		 user.POST("/luma-api-key", userHandler.SaveLumaApiKey)
   		 user.GET("/luma-api-key", userHandler.GetLumaApiKey)
    	user.DELETE("/luma-api-key", userHandler.DeleteLumaApiKey)

		// Event management for authenticated users
		user.POST("/events", userHandler.CreateEvent)           // Create events
		user.GET("/events/:id", userHandler.GetEvent)           // Get specific event
		user.PUT("/events/:id", userHandler.UpdateEvent)        // Update own events
		user.DELETE("/events/:id", userHandler.DeleteEvent)     // Delete own events
		
		// NFT management for authenticated users
		user.POST("/events/:id/mint", userHandler.MintNFT)      // Mint NFTs for events
	}

	return r
}