package luma

import (
	"encoding/json"
	"fmt"
	"net/http"
	"io/ioutil"
	"time"
	"log"
	"math"
	"sync"
	
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
)

// Client handles interactions with the Luma API with rate limiting
type Client struct {
	apiKey         string
	httpClient     *http.Client
	baseURL        string
	rateLimiter    *RateLimiter
}

// RateLimiter handles API rate limiting with exponential backoff
type RateLimiter struct {
	requestInterval time.Duration
	lastRequest     time.Time
	retryCount      int
	maxRetries      int
	mutex           sync.Mutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		requestInterval: 2 * time.Second, // 2 seconds between requests
		maxRetries:      3,
		retryCount:      0,
	}
}

// Wait implements rate limiting with exponential backoff
func (rl *RateLimiter) Wait() {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()
	
	now := time.Now()
	timeSinceLastRequest := now.Sub(rl.lastRequest)
	
	if timeSinceLastRequest < rl.requestInterval {
		waitTime := rl.requestInterval - timeSinceLastRequest
		log.Printf("Rate limiting: waiting %v before next API call", waitTime)
		time.Sleep(waitTime)
	}
	
	rl.lastRequest = time.Now()
}

// HandleRetry handles retry logic with exponential backoff
func (rl *RateLimiter) HandleRetry(statusCode int) (bool, time.Duration) {
	if statusCode == 429 { // Too Many Requests
		rl.retryCount++
		if rl.retryCount <= rl.maxRetries {
			// Exponential backoff: 2^retryCount seconds
			backoffTime := time.Duration(math.Pow(2, float64(rl.retryCount))) * time.Second
			log.Printf("Rate limit hit (429), retry %d/%d in %v", rl.retryCount, rl.maxRetries, backoffTime)
			return true, backoffTime
		}
	}
	
	// Reset retry count on success or other errors
	if statusCode == 200 {
		rl.retryCount = 0
	}
	
	return false, 0
}

// NewClient creates a new Luma API client with rate limiting
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey:      apiKey,
		httpClient:  &http.Client{Timeout: 30 * time.Second},
		baseURL:     "https://api.lu.ma/v1",
		rateLimiter: NewRateLimiter(),
	}
}

// makeAPIRequest makes a rate-limited request to the Luma API with retry logic
func (c *Client) makeAPIRequest(method, url, apiKey string) ([]byte, error) {
	var lastErr error
	
	for attempt := 0; attempt <= c.rateLimiter.maxRetries; attempt++ {
		// Rate limiting
		c.rateLimiter.Wait()
		
		req, err := http.NewRequest(method, url, nil)
		if err != nil {
			return nil, fmt.Errorf("error creating request: %w", err)
		}
		
		req.Header.Set("x-luma-api-key", apiKey)
		req.Header.Set("Content-Type", "application/json")
		
		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("HTTP request failed: %w", err)
			continue
		}
		
		body, err := ioutil.ReadAll(resp.Body)
		resp.Body.Close()
		
		if err != nil {
			lastErr = fmt.Errorf("error reading response body: %w", err)
			continue
		}
		
		log.Printf("API Request: %s - Status: %d", url, resp.StatusCode)
		
		// Handle rate limiting and retries
		if shouldRetry, backoffTime := c.rateLimiter.HandleRetry(resp.StatusCode); shouldRetry {
			time.Sleep(backoffTime)
			continue
		}
		
		if resp.StatusCode == 200 {
			return body, nil
		}
		
		lastErr = fmt.Errorf("API returned status: %d, body: %s", resp.StatusCode, string(body))
		
		// Don't retry on client errors (4xx except 429)
		if resp.StatusCode >= 400 && resp.StatusCode < 500 && resp.StatusCode != 429 {
			break
		}
	}
	
	return nil, lastErr
}

// GetAttendee gets an attendee by ID (keeping original mock for dev)
func (c *Client) GetAttendee(attendeeID string) (*models.Attendee, error) {
	if c.apiKey == "" {
		return &models.Attendee{
			ID:            attendeeID,
			Name:          "John Doe",
			Email:         "john.doe@example.com",
			WalletAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		}, nil
	}

	return &models.Attendee{
		ID:            attendeeID,
		Name:          "John Doe",
		Email:         "john.doe@example.com",
		WalletAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
	}, nil
}

// GetEvent gets an event by ID (keeping original mock for dev)
func (c *Client) GetEvent(eventID string) (*models.Event, error) {
	if c.apiKey == "" {
		return &models.Event{
			ID:       "1",
			Name:     "Polkadot Meetup",
			Date:     "2023-06-01",
			Location: "Berlin",
		}, nil
	}

	return &models.Event{
		ID:       "1",
		Name:     "Polkadot Meetup",
		Date:     "2023-06-01",
		Location: "Berlin",
	}, nil
}

// FetchSingleEvent fetches a single event with rate limiting
func (c *Client) FetchSingleEvent(apiKey string, eventID string) (*models.Event, error) {
	url := fmt.Sprintf("https://api.lu.ma/public/v1/event/get?api_id=%s", eventID)
	
	body, err := c.makeAPIRequest("GET", url, apiKey)
	if err != nil {
		return nil, err
	}

	var response struct {
		Event models.Event `json:"event"`
	}
	
	if err := json.Unmarshal(body, &response); err != nil {
		log.Printf("Error unmarshaling JSON: %v", err)
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return &response.Event, nil
}

// TestAPIKey tests the API key with rate limiting
func (c *Client) TestAPIKey(apiKey string) error {
	url := "https://api.lu.ma/public/v1/user/get-self"
	log.Printf("Testing API key with URL: %s", url)

	body, err := c.makeAPIRequest("GET", url, apiKey)
	if err != nil {
		return err
	}

	log.Printf("API key test successful - Body: %s", string(body))
	return nil
}

// ListEvents fetches all events with rate limiting
func (c *Client) ListEvents(apiKey string) ([]map[string]interface{}, error) {
	url := "https://api.lu.ma/public/v1/calendar/list-events?series_mode=events&pagination_limit=50&include_past_events=true"
	
	log.Printf("Fetching events from URL: %s", url)
	
	body, err := c.makeAPIRequest("GET", url, apiKey)
	if err != nil {
		return nil, err
	}

	log.Printf("List events - Response body: %s", string(body))

	var response struct {
		Entries []struct {
			Event map[string]interface{} `json:"event"`
		} `json:"entries"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		log.Printf("Error unmarshaling response: %v", err)
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	var events []map[string]interface{}
	for _, entry := range response.Entries {
		events = append(events, entry.Event)
	}

	log.Printf("Found %d events", len(events))
	return events, nil
}

// GetEventGuests fetches all guests with enhanced debugging and rate limiting
func (c *Client) GetEventGuests(apiKey string, eventID string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("https://api.lu.ma/public/v1/event/get-guests?event_api_id=%s&pagination_limit=500", eventID)
	
	log.Printf("Fetching event guests from URL: %s", url)
	
	body, err := c.makeAPIRequest("GET", url, apiKey)
	if err != nil {
		return nil, err
	}

	// Enhanced logging for debugging guest data issues
	log.Printf("Get guests - Raw response: %s", string(body))

	var response struct {
		Entries []struct {
			Guest map[string]interface{} `json:"guest"`
		} `json:"entries"`
		HasMore bool `json:"has_more"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		log.Printf("Error unmarshaling response: %v", err)
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	var guests []map[string]interface{}
	for _, entry := range response.Entries {
		guests = append(guests, entry.Guest)
	}

	log.Printf("Found %d guests for event %s", len(guests), eventID)
	
	// Log details about each guest for debugging
	for i, guest := range guests {
		log.Printf("Guest %d: %+v", i+1, guest)
		
		// Check if guest has checked in
if checkedInAt, ok := guest["checked_in_at"].(string); ok && checkedInAt != "" {
    log.Printf("Guest %d checked in at: %s", i+1, checkedInAt)
} else {
    log.Printf("Guest %d: no check-in status found", i+1)
}
		
		// Look for wallet address in various fields
		walletAddress := extractWalletAddress(guest)
		if walletAddress != "" {
			log.Printf("Guest %d wallet address: %s", i+1, walletAddress)
		} else {
			log.Printf("Guest %d: no wallet address found", i+1)
		}
	}
	
	return guests, nil
}

// extractWalletAddress tries to extract wallet address from guest data
func extractWalletAddress(guest map[string]interface{}) string {
	// Check custom_data field
	if customData, ok := guest["custom_data"].(map[string]interface{}); ok {
		if wallet, ok := customData["wallet_address"].(string); ok && wallet != "" {
			return wallet
		}
		if wallet, ok := customData["polkadot_wallet"].(string); ok && wallet != "" {
			return wallet
		}
	}
	
	// Check answers/form responses
	if answers, ok := guest["registration_answers"].([]interface{}); ok {
		for _, answer := range answers {
			if answerMap, ok := answer.(map[string]interface{}); ok {
    if question, ok := answerMap["label"].(string); ok {  // ← Changed "question" to "label"
	// Look for wallet-related questions
	if question == "Wallet Address" ||                    
	   question == "Polkadot Wallet" ||                   
	   question == "Wallet" ||                            
	   question == "DOT Wallet Address" ||
	   question == "Polkadot Address" {                   // ← Added this since your logs show "Polkadot Address"
		if value, ok := answerMap["answer"].(string); ok && value != "" {  // ← Changed "value" to "answer"
							return value
						}
					}
				}
			}
		}
	}
	
	// Check direct fields
	if wallet, ok := guest["wallet_address"].(string); ok && wallet != "" {
		return wallet
	}
	if wallet, ok := guest["polkadot_wallet"].(string); ok && wallet != "" {
		return wallet
	}
	
	return ""
}

// LumaAPIResponse represents the response structure from Luma API (kept for compatibility)
type LumaAPIResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
	Error   string          `json:"error,omitempty"`
}

// fetchFromAPI is kept for backward compatibility but now uses rate limiting
func (c *Client) fetchFromAPI(method, endpoint string, body []byte) (json.RawMessage, error) {
	url := c.baseURL + endpoint
	
	responseBody, err := c.makeAPIRequest(method, url, c.apiKey)
	if err != nil {
		return nil, err
	}

	var apiResp LumaAPIResponse
	if err := json.Unmarshal(responseBody, &apiResp); err != nil {
		return nil, err
	}

	if !apiResp.Success {
		return nil, fmt.Errorf("API error: %s", apiResp.Error)
	}

	return apiResp.Data, nil
}