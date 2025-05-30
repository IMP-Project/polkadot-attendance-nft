package models

import (
	"time"
	
)


type User struct {
	ID            string `gorm:"primaryKey"`
	WalletAddress string `gorm:"uniqueIndex"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}
