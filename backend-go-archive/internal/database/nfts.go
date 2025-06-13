package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
	"log"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
)

// NFT represents the database model for NFTs (for GORM migration)
type NFT struct {
	ID              uint64    `gorm:"primaryKey;autoIncrement"`
	EventID         string    `gorm:"not null;index"`
	Owner           string    `gorm:"not null;size:255"`
	Metadata        string    `gorm:"type:jsonb"`
	TransactionHash *string   `gorm:"size:255"`
	Confirmed       bool      `gorm:"default:false"`
	CreatedAt       time.Time `gorm:"autoCreateTime"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime"`
}

// TableName specifies the table name for GORM
func (NFT) TableName() string {
	return "nfts"
}

// NFTRepository handles database operations for NFTs
type NFTRepository struct {
	db *DB
}

// NewNFTRepository creates a new NFT repository
func NewNFTRepository(db *DB) *NFTRepository {
	return &NFTRepository{db: db}
}

// Create creates a new NFT
func (r *NFTRepository) Create(nft *models.NFT) error {
	// Convert metadata to JSON
	metadataJSON, err := json.Marshal(nft.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	// Insert NFT into database
	query := `
		INSERT INTO nfts (event_id, owner, metadata) 
		VALUES ($1, $2, $3)
		RETURNING id
	`
	err = r.db.QueryRow(
		query,
		nft.EventID,
		nft.Owner,
		metadataJSON,
	).Scan(&nft.ID)

	if err != nil {
		return fmt.Errorf("failed to create NFT: %w", err)
	}

	return nil
}

// GetByID gets an NFT by ID
func (r *NFTRepository) GetByID(id uint64) (*models.NFT, error) {
	query := `
		SELECT id, event_id, owner, metadata, transaction_hash, confirmed
		FROM nfts
		WHERE id = $1
	`

	var nft models.NFT
	var metadataJSON []byte
	var txHash sql.NullString
	var confirmed bool

	err := r.db.QueryRow(query, id).Scan(
		&nft.ID,
		&nft.EventID,
		&nft.Owner,
		&metadataJSON,
		&txHash,
		&confirmed,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get NFT: %w", err)
	}

	// Parse metadata JSON
	if err := json.Unmarshal(metadataJSON, &nft.Metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}

	return &nft, nil
}

// GetAllByEventID gets all NFTs for an event
func (r *NFTRepository) GetAllByEventID(eventID string) ([]models.NFT, error) {
	query := `
		SELECT id, event_id, owner, metadata, transaction_hash, confirmed, created_at
		FROM nfts
		WHERE event_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to query NFTs: %w", err)
	}
	defer rows.Close()

	var nfts []models.NFT
	for rows.Next() {
		var nft models.NFT
		var metadataJSON []byte
		var txHash sql.NullString

		err := rows.Scan(
			&nft.ID,
			&nft.EventID,
			&nft.Owner,
			&metadataJSON,
			&txHash,
			&nft.Confirmed,
			&nft.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan NFT: %w", err)
		}

		// Parse metadata JSON
		if err := json.Unmarshal(metadataJSON, &nft.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		// Handle nullable transaction hash
		if txHash.Valid {
			nft.TransactionHash = txHash.String
		}

		nfts = append(nfts, nft)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating NFTs: %w", err)
	}

	return nfts, nil
}

// GetAll gets all NFTs
func (r *NFTRepository) GetAll() ([]models.NFT, error) {
	query := `
		SELECT id, event_id, owner, metadata,transaction_hash, confirmed
		FROM nfts
		ORDER BY id
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query NFTs: %w", err)
	}
	defer rows.Close()

	var nfts []models.NFT
	for rows.Next() {
		var nft models.NFT
		var metadataJSON []byte
		var txHash sql.NullString
		var confirmed bool

		err := rows.Scan(
			&nft.ID,
			&nft.EventID,
			&nft.Owner,
			&metadataJSON,
			&txHash,
			&confirmed,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan NFT: %w", err)
		}

		// Parse metadata JSON
		if err := json.Unmarshal(metadataJSON, &nft.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		nfts = append(nfts, nft)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating NFTs: %w", err)
	}

	return nfts, nil
}

// GetAllByOwner gets all NFTs for an owner
func (r *NFTRepository) GetAllByOwner(owner string) ([]models.NFT, error) {
	query := `
		SELECT id, event_id, owner, metadata, transaction_hash, confirmed
		FROM nfts
		WHERE owner = $1
		ORDER BY id
	`

	rows, err := r.db.Query(query, owner)
	if err != nil {
		return nil, fmt.Errorf("failed to query NFTs: %w", err)
	}
	defer rows.Close()

	var nfts []models.NFT
	for rows.Next() {
		var nft models.NFT
		var metadataJSON []byte
		var txHash sql.NullString
		var confirmed bool

		err := rows.Scan(
			&nft.ID,
			&nft.EventID,
			&nft.Owner,
			&metadataJSON,
			&txHash,
			&confirmed,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan NFT: %w", err)
		}

		// Parse metadata JSON
		if err := json.Unmarshal(metadataJSON, &nft.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		nfts = append(nfts, nft)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating NFTs: %w", err)
	}

	return nfts, nil
}

// UpdateTxHash updates the transaction hash for an NFT
func (r *NFTRepository) UpdateTxHash(id uint64, txHash string) error {
	query := `
		UPDATE nfts
		SET transaction_hash = $1
		WHERE id = $2
	`

	result, err := r.db.Exec(query, txHash, id)
	if err != nil {
		return fmt.Errorf("failed to update NFT transaction hash: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("NFT not found")
	}

	return nil
}

// UpdateConfirmation updates the confirmation status for an NFT
func (r *NFTRepository) UpdateConfirmation(id uint64, confirmed bool) error {
	query := `
		UPDATE nfts
		SET confirmed = $1
		WHERE id = $2
	`

	result, err := r.db.Exec(query, confirmed, id)
	if err != nil {
		return fmt.Errorf("failed to update NFT confirmation status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("NFT not found")
	}

	return nil
} 

// UpdateNFTsWithDesign updates all NFTs for an event to use a specific design image
func (r *NFTRepository) UpdateNFTsWithDesign(eventID string, designImageURL string) error {
    // Get all NFTs for this event
    nfts, err := r.GetAllByEventID(eventID)
    if err != nil {
        return fmt.Errorf("failed to get NFTs for event: %w", err)
    }

    fmt.Printf("DEBUG: Found %d NFTs for event %s\n", len(nfts), eventID)

    // Update each NFT's metadata to include the new design image
    for _, nft := range nfts {
        fmt.Printf("DEBUG: Updating NFT %d with design URL: %s\n", nft.ID, designImageURL)
        
        // Update the image_data field in metadata
        nft.Metadata["image_data"] = designImageURL

        // Convert metadata to JSON
        metadataJSON, err := json.Marshal(nft.Metadata)
        if err != nil {
            fmt.Printf("DEBUG: JSON marshal error for NFT %d: %v\n", nft.ID, err)
            continue // Skip this NFT if JSON marshaling fails
        }

        // Update the NFT record using raw SQL
        query := `
            UPDATE nfts 
            SET metadata = $1, updated_at = NOW()
            WHERE id = $2
        `
        
        _, err = r.db.Exec(query, metadataJSON, nft.ID)
        if err != nil {
            fmt.Printf("DEBUG: SQL update error for NFT %d: %v\n", nft.ID, err)
            return fmt.Errorf("failed to update NFT %d: %w", nft.ID, err)
        }
        
        fmt.Printf("DEBUG: Successfully updated NFT %d\n", nft.ID)
    }

    fmt.Printf("DEBUG: Finished updating all NFTs\n")
    return nil
}

// ExistsByEventAndWallet checks if an NFT exists for a specific event and wallet
func (r *NFTRepository) ExistsByEventAndWallet(eventID, walletAddress string) (bool, error) {
    // Add debug logging
    log.Printf("DEBUG: Checking NFT existence - EventID: '%s', Wallet: '%s'", eventID, walletAddress)
    
    // First, let's see what NFTs actually exist in the database
    debugQuery := `SELECT id, event_id, owner FROM nfts WHERE event_id = $1 LIMIT 10`
    rows, err := r.db.Query(debugQuery, eventID)
    if err != nil {
        log.Printf("DEBUG: Error querying existing NFTs: %v", err)
    } else {
        log.Printf("DEBUG: Existing NFTs for event %s:", eventID)
        defer rows.Close()
        count := 0
        for rows.Next() {
            var id, event_id, owner string
            if err := rows.Scan(&id, &event_id, &owner); err == nil {
                log.Printf("DEBUG: NFT %d - ID: %s, EventID: %s, Owner: %s", count+1, id, event_id, owner)
                count++
            }
        }
        log.Printf("DEBUG: Total NFTs found: %d", count)
    }
    
    // Now check the original query
    query := `
        SELECT EXISTS(
            SELECT 1 FROM nfts 
            WHERE event_id = $1 AND owner = $2
        )
    `
    
    log.Printf("DEBUG: Running query: %s", query)
    log.Printf("DEBUG: With parameters: eventID='%s', walletAddress='%s'", eventID, walletAddress)
    
    var exists bool
    err = r.db.QueryRow(query, eventID, walletAddress).Scan(&exists)
    if err != nil {
        log.Printf("DEBUG: Query error: %v", err)
        return false, fmt.Errorf("failed to check NFT existence: %w", err)
    }
    
    log.Printf("DEBUG: Query result - EXISTS: %v", exists)
    return exists, nil
}