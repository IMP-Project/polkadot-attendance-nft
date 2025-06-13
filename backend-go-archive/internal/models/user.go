package models

import (
	"time"
)

type User struct {
	ID            uint64    `gorm:"primaryKey;autoIncrement"`
	WalletAddress string    `gorm:"uniqueIndex"`
	LumaAPIKey    string    `gorm:"column:luma_api_key"` // Store encrypted in production
	CreatedAt     time.Time
	UpdatedAt     time.Time
}