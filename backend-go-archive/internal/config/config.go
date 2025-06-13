package config

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
)

// RateLimit holds rate limiting configuration
type RateLimit struct {
	Enabled           bool `json:"enabled"`
	RequestsPerMinute int  `json:"requests_per_minute"`
}

// Database holds database configuration
type Database struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	DBName   string `json:"dbname"`
	SSLMode  string `json:"sslmode"`
}

// Config holds all configuration for the application
type Config struct {
	ServerAddress   string    `json:"server_address"`
	PolkadotRPC     string    `json:"polkadot_rpc"`
	ContractAddress string    `json:"contract_address"`
	LumaAPIKey      string    `json:"luma_api_key"`
	LumaWebhookKey  string    `json:"luma_webhook_key"`
	JWTSecret       string    `json:"jwt_secret"`
	AdminUsername   string    `json:"admin_username"`
	AdminPassword   string    `json:"admin_password"`
	RateLimit       RateLimit `json:"rate_limit"`
	Database        Database  `json:"database"`
}

// Load loads configuration from environment variables or a config file
func Load() *Config {
	cfg := &Config{
		ServerAddress:   getEnv("SERVER_ADDRESS", ":8080"),
		PolkadotRPC:     getEnv("POLKADOT_RPC_URL", "wss://ws.test.azero.dev"),
		ContractAddress: getEnv("CONTRACT_ADDRESS", ""),
		LumaAPIKey:      getEnv("LUMA_API_KEY", ""),
		LumaWebhookKey:  getEnv("LUMA_WEBHOOK_KEY", ""),
		JWTSecret:       getEnv("JWT_SECRET", "polkadot-attendance-secret-key"),
		AdminUsername:   getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword:   getEnv("ADMIN_PASSWORD", "password"),
		RateLimit: RateLimit{
			Enabled:           true,
			RequestsPerMinute: 60,
		},
		Database: Database{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnvAsInt("DB_PORT", 5432),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			DBName:   getEnv("DB_NAME", "attendance_nft"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
	}

	// Check if config file exists and load it
	if _, err := os.Stat("config.json"); err == nil {
		file, err := os.Open("config.json")
		if err != nil {
			log.Printf("Error opening config file: %v", err)
		} else {
			defer file.Close()
			decoder := json.NewDecoder(file)
			if err := decoder.Decode(cfg); err != nil {
				log.Printf("Error decoding config file: %v", err)
			}
		}
	}

	return cfg
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// getEnvAsInt gets an environment variable as an integer or returns a default value
func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	value := 0
	if _, err := fmt.Sscanf(valueStr, "%d", &value); err != nil {
		return defaultValue
	}
	return value
}