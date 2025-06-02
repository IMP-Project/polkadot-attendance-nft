package models

import (
	"time"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"gorm.io/gorm"
)

// JSONMap is a custom type for storing JSON data in the database
type JSONMap map[string]interface{}

// Value implements the driver.Valuer interface for database storage
func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface for database reading
func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("cannot scan %T into JSONMap", value)
	}
	
	return json.Unmarshal(bytes, j)
}

// NFT represents an attendance NFT with proper database tags
type NFT struct {
	ID              uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	EventID         string    `gorm:"type:varchar(255);not null;index" json:"event_id"`
	Owner           string    `gorm:"type:varchar(255);not null;index" json:"owner"`
	Metadata        JSONMap   `gorm:"type:json" json:"metadata"`
	TransactionHash string    `gorm:"type:varchar(255)" json:"transaction_hash,omitempty"`
	Confirmed       bool      `gorm:"default:false" json:"confirmed"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	
	// Relationship with Event
	Event           Event     `gorm:"foreignKey:EventID;references:ID" json:"event,omitempty"`
}

// CheckInEvent represents a Luma check-in event webhook payload
type CheckInEvent struct {
	EventID    string `json:"event_id"`
	AttendeeID string `json:"attendee_id"`
	Timestamp  string `json:"timestamp"`
}

// Attendee represents a Luma event attendee
type Attendee struct {
	ID            string `gorm:"primaryKey;type:varchar(255)" json:"id"`
	Name          string `gorm:"type:varchar(255);not null" json:"name"`
	Email         string `gorm:"type:varchar(255);index" json:"email"`
	WalletAddress string `gorm:"type:varchar(255);index" json:"wallet_address"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}