package models

import (
	"time"
)

// NFTDesign represents a design template for NFTs
type NFTDesign struct {
	ID           string                 `json:"id" gorm:"primaryKey"`
	EventID      string                 `json:"event_id" gorm:"index"`
	Title        string                 `json:"title"`
	Description  string                 `json:"description"`
	Traits       string                 `json:"traits"`
	ImageURL     string                 `json:"image_url" gorm:"not null"`      // Cloudinary URL
	CloudinaryID string                 `json:"cloudinary_id" gorm:"not null"` // For deletion
	FileSize     int64                  `json:"file_size"`                     // In bytes
	MimeType     string                 `json:"mime_type"`                     // image/png, image/jpeg
	Metadata     string 				`json:"metadata" gorm:"type:text"`
	CreatedBy    string                 `json:"created_by"` // User wallet address
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
	IsActive     bool                   `json:"is_active" gorm:"default:true"`
}

// TableName specifies the table name for GORM
func (NFTDesign) TableName() string {
	return "nft_designs"
}