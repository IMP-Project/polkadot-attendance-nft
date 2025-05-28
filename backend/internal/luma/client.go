package luma

import (
	"encoding/json"
	"fmt"
	"net/http"
	"io/ioutil" 
	
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

func (c *Client) FetchSingleEvent(apiKey string, eventID string) (*models.Event, error) {
	// Use api_id parameter instead of event_api_id (based on API error messages)
	url := fmt.Sprintf("https://api.lu.ma/public/v1/event/get?api_id=%s", eventID)
	fmt.Printf("Making request to URL: %s\n", url)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		return nil, err
	}
	req.Header.Set("x-luma-api-key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		fmt.Printf("Error making HTTP request: %v\n", err)
		return nil, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	
	fmt.Printf("Response status: %d\n", resp.StatusCode)
	fmt.Printf("Response body: %s\n", string(body))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Luma API returned status: %d, body: %s", resp.StatusCode, string(body))
	}

	var response struct {
	Event models.Event `json:"event"`
}
if err := json.Unmarshal(body, &response); err != nil {
	fmt.Printf("Error unmarshaling JSON: %v\n", err)
	return nil, fmt.Errorf("failed to decode response: %v", err)
}

return &response.Event, nil
}

func (c *Client) TestAPIKey(apiKey string) error {
	url := "https://api.lu.ma/public/v1/user/get-self"
	fmt.Printf("Testing API key with URL: %s\n", url)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("x-luma-api-key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	
	fmt.Printf("API key test - Status: %d\n", resp.StatusCode)
	fmt.Printf("API key test - Body: %s\n", string(body))

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API key test failed with status: %d, body: %s", resp.StatusCode, string(body))
	}

	return nil
}

func (c *Client) ListEvents(apiKey string) ([]map[string]interface{}, error) {
	url := "https://api.lu.ma/public/v1/calendar/list-events"
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-luma-api-key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status: %d", resp.StatusCode)
	}

	var response struct {
		Entries []struct {
			Event map[string]interface{} `json:"event"`
		} `json:"entries"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	var events []map[string]interface{}
	for _, entry := range response.Entries {
		events = append(events, entry.Event)
	}

	return events, nil
}