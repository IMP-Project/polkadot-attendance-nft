package database

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
	"gorm.io/gorm"
)

// DesignRepository handles NFT design database operations
type DesignRepository struct {
	db *gorm.DB
}

// NewDesignRepository creates a new design repository
func NewDesignRepository(db *gorm.DB) *DesignRepository {
	return &DesignRepository{db: db}
}

// Create creates a new NFT design
func (r *DesignRepository) Create(design *models.NFTDesign) error {
	if design.ID == "" {
		design.ID = uuid.New().String()
	}
	design.CreatedAt = time.Now()
	design.UpdatedAt = time.Now()
	return r.db.Create(design).Error
}

// GetByID retrieves a design by ID
func (r *DesignRepository) GetByID(id string) (*models.NFTDesign, error) {
	var design models.NFTDesign
	err := r.db.Where("id = ?", id).First(&design).Error
	if err != nil {
		return nil, err
	}
	return &design, nil
}

// GetByEventID retrieves all designs for an event
func (r *DesignRepository) GetByEventID(eventID string) ([]*models.NFTDesign, error) {
	var designs []*models.NFTDesign
	err := r.db.Where("event_id = ? AND is_active = ?", eventID, true).
		Order("created_at DESC").
		Find(&designs).Error
	if err != nil {
		return nil, err
	}
	return designs, nil
}

// GetAllByUser retrieves all designs created by a user
func (r *DesignRepository) GetAllByUser(userWallet string) ([]*models.NFTDesign, error) {
	var designs []*models.NFTDesign
	err := r.db.Where("created_by = ? AND is_active = ?", userWallet, true).
		Order("created_at DESC").
		Find(&designs).Error
	if err != nil {
		return nil, err
	}
	return designs, nil
}

// Update updates an existing design
func (r *DesignRepository) Update(design *models.NFTDesign) error {
	design.UpdatedAt = time.Now()
	return r.db.Save(design).Error
}

// Delete soft deletes a design (sets is_active to false)
func (r *DesignRepository) Delete(id string) error {
	return r.db.Model(&models.NFTDesign{}).
		Where("id = ?", id).
		Update("is_active", false).Error
}

// GetActiveDesignForEvent gets the active design for an event
func (r *DesignRepository) GetActiveDesignForEvent(eventID string) (*models.NFTDesign, error) {
	var design models.NFTDesign
	err := r.db.Where("event_id = ? AND is_active = ?", eventID, true).
		Order("created_at DESC").
		First(&design).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("no active design found for event %s", eventID)
		}
		return nil, err
	}
	return &design, nil
} 

