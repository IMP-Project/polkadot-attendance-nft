package models

import (
	"time"
	"gorm.io/gorm"
)

type Event struct {
	ID            string    `gorm:"primaryKey;type:varchar(255)" json:"api_id"`
	Name          string    `gorm:"type:varchar(500);not null" json:"name"`
	Date          string    `gorm:"type:varchar(50)" json:"start_at"`
	Location      string    `gorm:"type:varchar(500)" json:"timezone"`
	URL           string    `gorm:"type:varchar(1000)" json:"url"`
	Organizer     string    `gorm:"type:varchar(255)" json:"organizer,omitempty"`
	
	// Fixed UserID to match database expectations
	UserID        string    `gorm:"type:varchar(255);index" json:"user_id"`
	LastSyncedAt  time.Time `gorm:"type:timestamp;default:CURRENT_TIMESTAMP" json:"last_synced_at"`
	LumaUpdatedAt string    `gorm:"type:varchar(50)" json:"luma_updated_at"`
	IsDeleted     bool      `gorm:"default:false;index" json:"is_deleted"`
	
	// Standard GORM timestamps
	CreatedAt     time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	
	// Relationship with NFTs
	NFTs          []NFT     `gorm:"foreignKey:EventID;references:ID" json:"nfts,omitempty"`
}