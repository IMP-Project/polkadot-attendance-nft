package models

type Event struct {
	ID        string `json:"id"`       
	Name      string `json:"name"`     
	Date      string `json:"start_time"` // ← Fix this
	Location  string `json:"location"` 
	URL       string `json:"url"`      
	Organizer string `json:"organizer,omitempty"` 
}
