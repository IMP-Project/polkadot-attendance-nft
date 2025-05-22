package polkadot

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	gsrpc "github.com/centrifuge/go-substrate-rpc-client/v4"
	"github.com/centrifuge/go-substrate-rpc-client/v4/types"
	"github.com/vedhavyas/go-subkey/v2" // For Substrate address handling
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
)

// Client handles interactions with the Polkadot blockchain
type Client struct {
	api            *gsrpc.SubstrateAPI
	contractAddr   types.AccountID
	contractCaller ContractCaller
	chainName      string
	useMock        bool
}

// NewClient creates a new Polkadot client
func NewClient(rpcURL, contractAddress string) *Client {
	log.Printf("Connecting to %s...", rpcURL)
	// Connect to Polkadot node
	api, err := gsrpc.NewSubstrateAPI(rpcURL)
	if err != nil {
		log.Printf("Failed to connect to Polkadot node: %v", err)
		log.Printf("Using mock implementation for development")
		// Create a mock API for development
		return &Client{
			contractCaller: NewMockContractCaller(),
			useMock:        true,
			chainName:      "Mock",
		}
	}

	// Get chain name for logging
	var chainName string
	// Try to get the chain name from the system properties
	sysName, err := api.RPC.System.Name()
	if err == nil {
		chainName = string(sysName)
	}
	
	// If that failed, try to get the chain type
	if chainName == "" {
		chainType, err := api.RPC.System.Chain()
		if err == nil {
			chainName = string(chainType)
		}
	}
	
	if chainName == "" {
		chainName = "Unknown"
	}
	log.Printf("Connected to chain: %s", chainName)

	// Parse contract address if provided
	var contractAddr types.AccountID
	if contractAddress != "" {
		// Try to convert from Substrate format (like '5E34Vf...') to AccountID
		log.Printf("Processing contract address: %s", contractAddress)
		
		var addrBytes []byte
		var err error
		
		// Handle different address formats
		if strings.HasPrefix(contractAddress, "0x") {
			// Handle hex format
			hexStr := strings.TrimPrefix(contractAddress, "0x")
			addrBytes, err = hex.DecodeString(hexStr)
			if err != nil {
				log.Printf("Invalid hex address: %v", err)
			}
		} else {
			// Try as Substrate SS58 address
			_, pubKey, err := subkey.SS58Decode(contractAddress)
			if err != nil {
				log.Printf("Invalid SS58 address: %v", err)
			} else {
				addrBytes = pubKey
			}
		}
		
		// If we successfully decoded the address
		if len(addrBytes) == 32 { // AccountID is 32 bytes
			copy(contractAddr[:], addrBytes)
			log.Printf("Successfully converted address to AccountID")
		} else {
			log.Printf("Address conversion failed, falling back to mock implementation")
			return &Client{
				api:            api,
				contractCaller: NewMockContractCaller(),
				useMock:        true,
				chainName:      chainName,
			}
		}
	} else {
		log.Printf("No contract address provided, using mock implementation")
		return &Client{
			api:            api,
			contractCaller: NewMockContractCaller(),
			useMock:        true,
			chainName:      chainName,
		}
	}

	// Create contract caller
	caller := NewContractCaller(api, contractAddr)

	// Check if we got a real or mock caller
	useMock := false
	if _, isMock := caller.(*MockContractCaller); isMock {
		useMock = true
		log.Printf("Using mock contract implementation")
	} else {
		log.Printf("Using real contract at address: %s", contractAddress)
	}

	return &Client{
		api:            api,
		contractAddr:   contractAddr,
		contractCaller: caller,
		useMock:        useMock,
		chainName:      chainName,
	}
}

// CreateEvent creates a new event in the smart contract
func (c *Client) CreateEvent(name, date, location string) (uint64, error) {
	log.Printf("Creating event: %s, %s, %s", name, date, location)
	
	// Input validation
	if name == "" || date == "" || location == "" {
		return 0, fmt.Errorf("name, date, and location are required")
	}
	
	// Call the smart contract
	log.Printf("Calling contract method: create_event")
	result, err := c.contractCaller.Call("create_event", name, date, location)
	if err != nil {
		return 0, fmt.Errorf("failed to create event: %v", err)
	}

	// Parse result
	var eventID uint64
	if err := json.Unmarshal(result, &eventID); err != nil {
		return 0, fmt.Errorf("failed to parse event ID: %v", err)
	}

	log.Printf("Event created with ID: %d", eventID)
	return eventID, nil
}

// GetEvent gets an event by ID
func (c *Client) GetEvent(id uint64) (*models.Event, error) {
	log.Printf("Getting event with ID: %d", id)
	
	// Call the smart contract
	log.Printf("Calling contract method: get_event")
	result, err := c.contractCaller.Call("get_event", id)
	if err != nil {
		return nil, fmt.Errorf("failed to get event: %v", err)
	}

	// Check if event exists (empty result)
	if len(result) == 0 {
		log.Printf("Event %d not found", id)
		return nil, nil
	}

	// Parse result
	var event models.Event
	if err := json.Unmarshal(result, &event); err != nil {
		return nil, fmt.Errorf("failed to parse event: %v", err)
	}

	log.Printf("Retrieved event: %+v", event)
	return &event, nil
}

// ListEvents lists all events
func (c *Client) ListEvents() ([]models.Event, error) {
	log.Printf("Listing all events")
	
	// Get total event count
	log.Printf("Calling contract method: get_event_count")
	countResult, err := c.contractCaller.Call("get_event_count")
	if err != nil {
		return nil, fmt.Errorf("failed to get event count: %v", err)
	}

	var count uint64
	if err := json.Unmarshal(countResult, &count); err != nil {
		return nil, fmt.Errorf("failed to parse event count: %v", err)
	}

	log.Printf("Found %d events", count)
	events := make([]models.Event, 0, count)
	for i := uint64(1); i <= count; i++ {
		event, err := c.GetEvent(i)
		if err != nil {
			log.Printf("Failed to get event %d: %v", i, err)
			continue
		}
		if event != nil {
			events = append(events, *event)
		}
	}

	return events, nil
}

// MintNFT mints a new NFT for an attendee
func (c *Client) MintNFT(eventID uint64, recipient string, metadata map[string]interface{}) (bool, error) {
	log.Printf("Minting NFT for event %d to recipient %s", eventID, recipient)
	
	// Validate recipient address
	if recipient == "" {
		return false, fmt.Errorf("recipient address is required")
	}
	
	// Validate event ID
	if eventID == 0 {
		return false, fmt.Errorf("invalid event ID")
	}
	
	// Convert metadata to JSON string
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return false, fmt.Errorf("failed to marshal metadata: %v", err)
	}

	// Call the smart contract
	log.Printf("Calling contract method: mint_nft")
	result, err := c.contractCaller.Call("mint_nft", eventID, recipient, string(metadataJSON))
	if err != nil {
		return false, fmt.Errorf("failed to mint NFT: %v", err)
	}

	// Parse result
	var success bool
	if err := json.Unmarshal(result, &success); err != nil {
		return false, fmt.Errorf("failed to parse result: %v", err)
	}

	if success {
		log.Printf("NFT minted successfully")
	} else {
		log.Printf("NFT minting failed")
	}
	
	return success, nil
}

// ListNFTs lists all NFTs
func (c *Client) ListNFTs() ([]models.NFT, error) {
	log.Printf("Listing all NFTs")
	
	// Get total NFT count
	log.Printf("Calling contract method: get_nft_count")
	countResult, err := c.contractCaller.Call("get_nft_count")
	if err != nil {
		return nil, fmt.Errorf("failed to get NFT count: %v", err)
	}

	var count uint64
	if err := json.Unmarshal(countResult, &count); err != nil {
		return nil, fmt.Errorf("failed to parse NFT count: %v", err)
	}

	log.Printf("Found %d NFTs", count)
	
	// If using mock implementation and no NFTs exist, return demo data
	if c.useMock && count == 0 {
		log.Printf("Using demo NFT data")
		return []models.NFT{
			{
				ID:      1,
				EventID: 1,
				Owner:   "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				Metadata: map[string]interface{}{
					"name":        "Attendance: Polkadot Meetup",
					"description": "Proof of attendance for Polkadot Meetup",
					"event_name":  "Polkadot Meetup",
					"event_date":  "2023-06-01",
					"location":    "Berlin",
					"attendee":    "John Doe",
				},
			},
		}, nil
	}

	// For real implementation, we would fetch each NFT
	// For now, just return an empty array
	nfts := make([]models.NFT, 0, count)
	return nfts, nil
} 