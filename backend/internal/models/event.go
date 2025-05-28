package models

type Event struct {
	ID        string `json:"api_id"`     // Changed from "id" to "api_id"
	Name      string `json:"name"`       // ✅ Correct
	Date      string `json:"start_at"`   // Changed from "start_time" to "start_at"
	Location  string `json:"timezone"`   // Use timezone since geo location is null
	URL       string `json:"url"`        // ✅ Correct
	Organizer string `json:"organizer,omitempty"` 
}