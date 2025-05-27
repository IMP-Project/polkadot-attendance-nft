package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"
	 "os"
	_ "github.com/lib/pq" // PostgreSQL driver
)

// Config represents database configuration
type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// DB is a wrapper around *sql.DB with additional functionality
type DB struct {
	*sql.DB
}

func New() (*DB, error) {
	// Use full DATABASE_URL (from Render)
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	log.Println("Connected to database using DATABASE_URL")

	return &DB{db}, nil
}

// MigrateUp performs database migrations
func (db *DB) MigrateUp() error {
	// Create events table if it doesn't exist
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS events (
			id SERIAL PRIMARY KEY,
			name VARCHAR(100) NOT NULL,
			date DATE NOT NULL,
			location VARCHAR(100) NOT NULL,
			organizer VARCHAR(100) NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`); err != nil {
		return fmt.Errorf("failed to create events table: %w", err)
	}

	// Create NFTs table if it doesn't exist
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS nfts (
			id SERIAL PRIMARY KEY,
			event_id INTEGER NOT NULL REFERENCES events(id),
			owner VARCHAR(100) NOT NULL,
			metadata JSONB NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			tx_hash VARCHAR(100),
			confirmed BOOLEAN NOT NULL DEFAULT FALSE
		)
	`); err != nil {
		return fmt.Errorf("failed to create nfts table: %w", err)
	}

	// Create users table if it doesn't exist
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			wallet_address VARCHAR(100) NOT NULL UNIQUE,
			username VARCHAR(100),
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			last_login TIMESTAMP
		)
	`); err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}

	// Create event_permissions table if it doesn't exist
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS event_permissions (
			id SERIAL PRIMARY KEY,
			event_id INTEGER NOT NULL REFERENCES events(id),
			user_id INTEGER NOT NULL REFERENCES users(id),
			role VARCHAR(20) NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			UNIQUE(event_id, user_id)
		)
	`); err != nil {
		return fmt.Errorf("failed to create event_permissions table: %w", err)
	}

	log.Println("Database migrations completed successfully")
	return nil
} 