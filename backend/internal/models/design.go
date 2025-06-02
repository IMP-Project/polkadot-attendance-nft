package models

import (
	"time"
)

// NFTDesign represents a design template for NFTs
type NFTDesign struct {
	ID          string                 `json:"id" gorm:"primaryKey"`
	EventID     string                 `json:"event_id" gorm:"index"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Traits      string                 `json:"traits"`
	ImageData   string                 `json:"image_data" gorm:"type:text"` // Base64 encoded image
	Metadata    map[string]interface{} `json:"metadata" gorm:"type:json"`
	CreatedBy   string                 `json:"created_by"` // User wallet address
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	IsActive    bool                   `json:"is_active" gorm:"default:true"`
}

// TableName specifies the table name for GORM
func (NFTDesign) TableName() string {
	return "nft_designs"
} 