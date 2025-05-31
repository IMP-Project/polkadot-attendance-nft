package models

import "time"

type Event struct {
	ID           string    `json:"api_id"`     
	Name         string    `json:"name"`       
	Date         string    `json:"start_at"`   
	Location     string    `json:"timezone"`   
	URL          string    `json:"url"`        
	Organizer    string    `json:"organizer,omitempty"`
	
	// New fields for sync tracking
	UserID       string    `json:"user_id"`      // Which user imported this event
	LastSyncedAt time.Time `json:"last_synced_at"` // When was this last synced
	LumaUpdatedAt string   `json:"luma_updated_at"` // Luma's updated_at field
	IsDeleted    bool      `json:"is_deleted"`    // Soft delete flag
}