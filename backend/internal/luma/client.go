package luma

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
)

// Client handles interactions with the Luma API
type Client struct {
	apiKey     string
	httpClient *http.Client
	baseURL    string
}

// NewClient creates a new Luma API client
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey:     apiKey,
		httpClient: &http.Client{},
		baseURL:    "https://api.lu.ma/v1",
	}
}

// GetAttendee gets an attendee by ID
func (c *Client) GetAttendee(attendeeID string) (*models.Attendee, error) {
	// If in development mode without API key, use mock data
	if c.apiKey == "" {
		return &models.Attendee{
			ID:            attendeeID,
			Name:          "John Doe",
			Email:         "john.doe@example.com",
			WalletAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		}, nil
	}

	// In a real implementation, this would make an HTTP request to the Luma API
	// Example:
	// url := fmt.Sprintf("%s/attendees/%s", c.baseURL, attendeeID)
	// req, err := http.NewRequest("GET", url, nil)
	// if err != nil {
	//     return nil, err
	// }
	//
	// req.Header.Set("Authorization", "Bearer "+c.apiKey)
	// req.Header.Set("Content-Type", "application/json")
	//
	// resp, err := c.httpClient.Do(req)
	// if err != nil {
	//     return nil, err
	// }
	// defer resp.Body.Close()
	//
	// if resp.StatusCode != http.StatusOK {
	//     return nil, fmt.Errorf("API returned status: %d", resp.StatusCode)
	// }
	//
	// var attendee models.Attendee
	// if err := json.NewDecoder(resp.Body).Decode(&attendee); err != nil {
	//     return nil, err
	// }

	// For now, return mock data
	return &models.Attendee{
		ID:            attendeeID,
		Name:          "John Doe",
		Email:         "john.doe@example.com",
		WalletAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
	}, nil
}

// GetEvent gets an event by ID
func (c *Client) GetEvent(eventID string) (*models.Event, error) {
	// If in development mode without API key, use mock data
	if c.apiKey == "" {
		return &models.Event{
			ID:       "1",
			Name:     "Polkadot Meetup",
			Date:     "2023-06-01",
			Location: "Berlin",
		}, nil
	}

	// In a real implementation, this would make an HTTP request to the Luma API
	// Similar to GetAttendee but with the events endpoint

	// For now, return mock data
	return &models.Event{
		ID:       "1",
		Name:     "Polkadot Meetup",
		Date:     "2023-06-01",
		Location: "Berlin",
	}, nil
}

// FetchEvents fetches events from Luma using a provided API key (external user)
func (c *Client) FetchEvents(externalAPIKey string) ([]models.Event, error) {
	url := "https://api.lu.ma/public/v1/events"

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-luma-api-key", externalAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Luma API returned status: %d", resp.StatusCode)
	}

	var result struct {
		Events []models.Event `json:"events"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Events, nil
}



// Actual Luma API integration would look something like this:

// LumaAPIResponse represents the response structure from Luma API
type LumaAPIResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
	Error   string          `json:"error,omitempty"`
}

// fetchFromAPI makes a request to the Luma API
func (c *Client) fetchFromAPI(method, endpoint string, body []byte) (json.RawMessage, error) {
	url := c.baseURL + endpoint

	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status: %d", resp.StatusCode)
	}

	var apiResp LumaAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}

	if !apiResp.Success {
		return nil, fmt.Errorf("API error: %s", apiResp.Error)
	}

	return apiResp.Data, nil
}