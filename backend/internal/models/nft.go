package models

import "time"

// NFT represents an attendance NFT
type NFT struct {
	ID              uint64                 `json:"id"`
	EventID         string                 `json:"event_id"`
	Owner           string                 `json:"owner"`
	Metadata        map[string]interface{} `json:"metadata"`
	TransactionHash string                 `json:"transaction_hash,omitempty"`
	Confirmed       bool                   `json:"confirmed"`
	CreatedAt       time.Time              `json:"created_at"`
}

// CheckInEvent represents a Luma check-in event webhook payload
type CheckInEvent struct {
	EventID    string `json:"event_id"`
	AttendeeID string `json:"attendee_id"`
	Timestamp  string `json:"timestamp"`
}

// Attendee represents a Luma event attendee
type Attendee struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Email         string `json:"email"`
	WalletAddress string `json:"wallet_address"`
}