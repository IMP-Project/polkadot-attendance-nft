package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

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
	// Use full DATABASE_URL (from Render) and trim any whitespace/newlines
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	// Debug: Log the cleaned URL (remove this after fixing)
	log.Printf("Using DATABASE_URL: %q", dsn)

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
	// Create events table first (no dependencies)
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
	log.Println("Events table created/verified")

	// Create users table (no dependencies)
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
	log.Println("Users table created/verified")

	// Create NFTs table (depends on events table)
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS nfts (
			id SERIAL PRIMARY KEY,
			event_id INTEGER NOT NULL,
			owner VARCHAR(100) NOT NULL,
			metadata JSONB NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			tx_hash VARCHAR(100),
			confirmed BOOLEAN NOT NULL DEFAULT FALSE
		)
	`); err != nil {
		return fmt.Errorf("failed to create nfts table: %w", err)
	}
	log.Println("NFTs table created/verified")

	// Add foreign key constraint separately (if it doesn't exist)
	if _, err := db.Exec(`
		DO $ 
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM information_schema.table_constraints 
				WHERE constraint_name = 'nfts_event_id_fkey' 
				AND table_name = 'nfts'
			) THEN
				ALTER TABLE nfts ADD CONSTRAINT nfts_event_id_fkey 
				FOREIGN KEY (event_id) REFERENCES events(id);
			END IF;
		END $;
	`); err != nil {
		return fmt.Errorf("failed to add foreign key constraint to nfts table: %w", err)
	}
	log.Println("NFTs foreign key constraint verified")

	// Create event_permissions table (depends on both events and users)
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS event_permissions (
			id SERIAL PRIMARY KEY,
			event_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			role VARCHAR(20) NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`); err != nil {
		return fmt.Errorf("failed to create event_permissions table: %w", err)
	}
	log.Println("Event permissions table created/verified")

	// Add foreign key constraints separately for event_permissions
	if _, err := db.Exec(`
		DO $ 
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM information_schema.table_constraints 
				WHERE constraint_name = 'event_permissions_event_id_fkey' 
				AND table_name = 'event_permissions'
			) THEN
				ALTER TABLE event_permissions ADD CONSTRAINT event_permissions_event_id_fkey 
				FOREIGN KEY (event_id) REFERENCES events(id);
			END IF;
		END $;
	`); err != nil {
		return fmt.Errorf("failed to add event foreign key constraint to event_permissions table: %w", err)
	}

	if _, err := db.Exec(`
		DO $ 
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM information_schema.table_constraints 
				WHERE constraint_name = 'event_permissions_user_id_fkey' 
				AND table_name = 'event_permissions'
			) THEN
				ALTER TABLE event_permissions ADD CONSTRAINT event_permissions_user_id_fkey 
				FOREIGN KEY (user_id) REFERENCES users(id);
			END IF;
		END $;
	`); err != nil {
		return fmt.Errorf("failed to add user foreign key constraint to event_permissions table: %w", err)
	}

	// Add unique constraint separately
	if _, err := db.Exec(`
		DO $ 
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM information_schema.table_constraints 
				WHERE constraint_name = 'event_permissions_event_id_user_id_key' 
				AND table_name = 'event_permissions'
			) THEN
				ALTER TABLE event_permissions ADD CONSTRAINT event_permissions_event_id_user_id_key 
				UNIQUE(event_id, user_id);
			END IF;
		END $;
	`); err != nil {
		return fmt.Errorf("failed to add unique constraint to event_permissions table: %w", err)
	}

	log.Println("Database migrations completed successfully")
	return nil
}