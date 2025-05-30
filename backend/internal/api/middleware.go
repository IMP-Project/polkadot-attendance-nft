package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"  // Updated to v5 to match user.go
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/config"
	"github.com/patrickmn/go-cache"
	"strconv"
)

// BasicAuthMiddleware provides basic authentication for admin routes
func BasicAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return gin.BasicAuth(gin.Accounts{
		cfg.AdminUsername: cfg.AdminPassword,
	})
}

// CorsMiddleware adds CORS headers to responses
func CorsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// Rate limiter cache
var requestCache = cache.New(5*time.Minute, 10*time.Minute)

// RateLimiter limits request rate by IP address
func RateLimiter(enabled bool, requestsPerMinute int) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip if rate limiting is disabled
		if !enabled {
			c.Next()
			return
		}

		// Get client IP
		ip := c.ClientIP()
		
		// Get current minute as cache key
		minute := time.Now().Format("2006-01-02 15:04")
		key := ip + ":" + minute
		
		// Check if key exists
		count, found := requestCache.Get(key)
		if !found {
			// First request this minute
			requestCache.Set(key, 1, cache.DefaultExpiration)
			c.Next()
			return
		}
		
		// Check rate limit
		reqCount := count.(int)
		if reqCount >= requestsPerMinute {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Try again in 60 seconds.",
			})
			return
		}
		
		// Increment request count
		requestCache.Set(key, reqCount+1, cache.DefaultExpiration)
		
		// Add rate limit headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(requestsPerMinute))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(requestsPerMinute-reqCount-1))
		
		c.Next()
	}
}

// ValidateContractAddress validates and formats contract addresses
func ValidateContractAddress(address string) string {
	// If address is empty, return empty
	if address == "" {
		return ""
	}

	// If it's a Substrate address (starting with 5)
	if strings.HasPrefix(address, "5") {
		return address
	}

	// If address doesn't start with 0x, add it
	if !strings.HasPrefix(address, "0x") {
		return "0x" + address
	}

	return address
}

// JWTAuth provides JWT authentication
func JWTAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		// Extract token from "Bearer <token>"
		tokenString := ""
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			return
		}

		// Parse and validate token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// Validate claims
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			// Check expiration
			if exp, ok := claims["exp"].(float64); ok {
				if int64(exp) < time.Now().Unix() {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
					return
				}
			}

			// FIXED: Set user ID from token claims using correct key
			if userID, ok := claims["user_id"].(string); ok {
				c.Set("user_id", userID)
				c.Next()
			} else {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not found in token"})
				return
			}
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}
	}
}

// OwnershipMiddleware checks if the user owns the requested event
func OwnershipMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// This middleware would check if the authenticated wallet address
		// is the owner of the resource being accessed
		// For now, we'll implement a permissionless system where any
		// authenticated user can access everything

		c.Next()
	}
}