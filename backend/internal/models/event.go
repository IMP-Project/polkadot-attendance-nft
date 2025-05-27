package models

type Event struct {
	ID        string `json:"id"`         // from Luma
	Name      string `json:"name"`       // from Luma
	Date      string `json:"date"`       // from Luma
	Location  string `json:"location"`   // from Luma
	URL       string `json:"url"`        // optional, from Luma
	Organizer string `json:"organizer,omitempty"` // your custom field
}
