package polkadot

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"

	gsrpc "github.com/centrifuge/go-substrate-rpc-client/v4"
	"github.com/centrifuge/go-substrate-rpc-client/v4/types"
	"github.com/centrifuge/go-substrate-rpc-client/v4/signature"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
)

// Global singleton mock instance to maintain state between calls
var (
	globalMockCaller *MockContractCaller
	mockCallerMutex  sync.Mutex
	contractMetadata *ContractMetadata
)

// ContractCaller interface for calling smart contracts
type ContractCaller interface {
	Call(method string, args ...interface{}) ([]byte, error)
}

// RealContractCaller implements the ContractCaller interface for real blockchain interactions
type RealContractCaller struct {
	api          *gsrpc.SubstrateAPI
	contractAddr types.AccountID
	signer       *signature.KeyringPair
	// Use a shared mock instance for fallback
	sharedMock   *MockContractCaller
	metadata     *ContractMetadata
}

// NewContractCaller creates a new contract caller
func NewContractCaller(api *gsrpc.SubstrateAPI, contractAddr types.AccountID) ContractCaller {
	// Get the shared mock instance
	sharedMock := GetSharedMockContractCaller()
	
	// If we have a valid API and contract address, return a real caller
	if api != nil && contractAddr != (types.AccountID{}) {
		// Load the development keypair for testing
		// In production, this would load a secure keypair from environment variables or secure storage
		signer, err := signature.KeyringPairFromSecret("//Alice", 42) // Use network-specific cryptography (42 for Westend)
		if err != nil {
			log.Printf("Failed to create signer: %v", err)
			log.Printf("Falling back to mock implementation")
			return sharedMock
		}
		
		// Try to load contract metadata
		metadata, err := loadContractMetadataWithCaching("attendance_nft.json")
		if err != nil {
			log.Printf("Failed to load contract metadata: %v", err)
			log.Printf("Some contract functions may not be available, falling back to mock for those")
		}
		
		return &RealContractCaller{
			api:          api,
			contractAddr: contractAddr,
			signer:       &signer,
			sharedMock:   sharedMock,
			metadata:     metadata,
		}
	}

	// Otherwise return a mock caller
	return sharedMock
}

// loadContractMetadataWithCaching loads and caches contract metadata
func loadContractMetadataWithCaching(contractFile string) (*ContractMetadata, error) {
	if contractMetadata != nil {
		return contractMetadata, nil
	}
	
	metadata, err := LoadContractMetadata(contractFile)
	if err != nil {
		return nil, err
	}
	
	contractMetadata = metadata
	return metadata, nil
}

// Call calls a smart contract method
func (c *RealContractCaller) Call(method string, args ...interface{}) ([]byte, error) {
	log.Printf("Calling contract method: %s", method)
	
	// If we don't have metadata, fall back to mock
	if c.metadata == nil {
		log.Printf("No contract metadata available, using mock implementation for method: %s", method)
		return c.sharedMock.Call(method, args...)
	}
	
	// Try to find the method in the metadata
	contractMethod, err := FindMethodInMetadata(c.metadata, method)
	if err != nil {
		log.Printf("Method not found in metadata: %s, error: %v", method, err)
		log.Printf("Using mock implementation for unknown method: %s", method)
		return c.sharedMock.Call(method, args...)
	}
	
	// Add arguments to the method
	contractMethod.Args = args
	
	// Check if this is a read-only operation
	if isReadOnlyMethod(method) {
		// For read operations, query the contract state
		log.Printf("Performing read-only contract call: %s", method)
		result, err := QueryContractState(c.api, c.contractAddr, contractMethod, args...)
		if err != nil {
			log.Printf("Failed to query contract state: %v", err)
			log.Printf("Falling back to mock implementation for query: %s", method)
			return c.sharedMock.Call(method, args...)
		}
		return result, nil
	}
	
	// For state-changing operations, we need to submit a transaction
	log.Printf("Preparing state-changing contract call: %s", method)
	
	// Prepare the contract call
	call, err := PrepareContractCall(c.api, c.contractAddr, contractMethod, args...)
	if err != nil {
		log.Printf("Failed to prepare contract call: %v", err)
		log.Printf("Falling back to mock implementation for state change: %s", method)
		return c.sharedMock.Call(method, args...)
	}
	
	// Create a signed extrinsic
	ext, err := CreateSignedExtrinsic(c.api, call, *c.signer)
	if err != nil {
		log.Printf("Failed to create signed extrinsic: %v", err)
		log.Printf("Falling back to mock implementation for state change: %s", method)
		return c.sharedMock.Call(method, args...)
	}
	
	// Submit the extrinsic
	sub, err := c.api.RPC.Author.SubmitAndWatchExtrinsic(ext)
	if err != nil {
		log.Printf("Failed to submit extrinsic: %v", err)
		log.Printf("Falling back to mock implementation for state change: %s", method)
		return c.sharedMock.Call(method, args...)
	}
	defer sub.Unsubscribe()
	
	// Wait for the transaction to be included in a block
	for {
		status := <-sub.Chan()
		if status.IsInBlock {
			log.Printf("Extrinsic included in block: %#x", status.AsInBlock)
			break
		}
		if status.IsDropped || status.IsInvalid || status.IsUsurped {
			return nil, fmt.Errorf("extrinsic failed: %v", status)
		}
	}
	
	// For now, return a success response
	// In a more complete implementation, we would extract events and return the actual result
	
	// Return the encoded result based on the method
	switch method {
	case "create_event":
		// Mock a successful event creation with ID 1
		return json.Marshal(uint64(1))
	case "mint_nft":
		// Mock a successful NFT minting
		return json.Marshal(true)
	default:
		// For other methods, just return a success indicator
		return json.Marshal(true)
	}
}

// isReadOnlyMethod determines if a method is read-only (view/pure function)
func isReadOnlyMethod(method string) bool {
	readOnlyMethods := map[string]bool{
		"get_event":      true,
		"get_nft":        true,
		"get_event_count": true,
		"get_nft_count":  true,
	}
	
	return readOnlyMethods[method]
}

// GetSharedMockContractCaller returns the global mock contract caller instance
func GetSharedMockContractCaller() *MockContractCaller {
	mockCallerMutex.Lock()
	defer mockCallerMutex.Unlock()
	
	if globalMockCaller == nil {
		// Initialize with default data
		events := map[uint64]models.Event{
			1: {
				ID:        "1",
				Name:      "Polkadot Meetup",
				Date:      "2023-06-01",
				Location:  "Berlin",
				Organizer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			},
		}
		
		globalMockCaller = &MockContractCaller{
			events:     events,
			nfts:       make(map[uint64]models.NFT),
			eventCount: 1,
			nftCount:   0,
		}
		
		log.Printf("Created global mock contract caller instance")
	}
	
	return globalMockCaller
}

// NewMockContractCaller creates a new mock contract caller with some initial data
func NewMockContractCaller() *MockContractCaller {
	// Always return the shared instance
	return GetSharedMockContractCaller()
}

// MockContractCaller provides a mock implementation for development
type MockContractCaller struct {
	events     map[uint64]models.Event
	nfts       map[uint64]models.NFT
	eventCount uint64
	nftCount   uint64
	mutex      sync.Mutex // To protect concurrent access
}

// Call mocks a smart contract method call
func (c *MockContractCaller) Call(method string, args ...interface{}) ([]byte, error) {
	// Lock to prevent race conditions
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	log.Printf("Mock contract caller: %s with %d args", method, len(args))
	
	switch method {
	case "create_event":
		if len(args) < 3 {
			return nil, fmt.Errorf("create_event requires 3 arguments")
		}

		name, ok1 := args[0].(string)
		date, ok2 := args[1].(string)
		location, ok3 := args[2].(string)

		if !ok1 || !ok2 || !ok3 {
			return nil, fmt.Errorf("invalid argument types")
		}

		c.eventCount++
		eventID := c.eventCount

		c.events[eventID] = models.Event{
			ID: fmt.Sprintf("%d", eventID),
			Name:      name,
			Date:      date,
			Location:  location,
			Organizer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", // Mock organizer
		}
		
		log.Printf("Created mock event with ID %d: %s", eventID, name)

		return json.Marshal(eventID)

	case "get_event":
		if len(args) < 1 {
			return nil, fmt.Errorf("get_event requires 1 argument")
		}

		var id uint64
switch v := args[0].(type) {
case uint64:
	id = v
case float64:
	id = uint64(v)
case int:
	id = uint64(v)
case json.Number:
	val, err := v.Int64()
	if err != nil {
		return nil, fmt.Errorf("invalid event ID: %v", err)
	}
	id = uint64(val)
case string:
	// For string event IDs, use a simple hash
	id = uint64(len(v))
case map[string]interface{}:
	// This handles the case where we're passing a marshaled callData object
	if methodArgs, ok := v["args"].([]interface{}); ok && len(methodArgs) > 0 {
		if idVal, ok := methodArgs[0].(float64); ok {
			id = uint64(idVal)
		} else {
			return nil, fmt.Errorf("invalid event ID type in callData")
		}
	} else {
		return nil, fmt.Errorf("invalid callData format")
	}
default:
	return nil, fmt.Errorf("invalid event ID type: %T", args[0])
}
		log.Printf("Looking up event ID: %d (available: %v)", id, c.events)

		event, exists := c.events[id]
		if !exists {
			log.Printf("Event %d not found in mock storage", id)
			return []byte{}, nil
		}
		
		log.Printf("Found event %d: %s", id, event.Name)

		return json.Marshal(event)
	
	case "mint_nft":
		if len(args) < 3 {
			return nil, fmt.Errorf("mint_nft requires 3 arguments")
		}

		var eventID uint64
		var recipient string
		var metadataJSON string
		var ok bool

		// Handle eventID with flexible type conversion
		// Handle eventID with flexible type conversion
switch v := args[0].(type) {
case uint64:
    eventID = v
case float64:
    eventID = uint64(v)
case int:
    eventID = uint64(v)
case string:
    // Convert string event ID to uint64 (hash or simple conversion)
    eventID = uint64(len(v)) // Simple hash based on length, or use a better hash
default:
    return nil, fmt.Errorf("invalid event ID type: %T", args[0])
}

		// Get recipient
		if recipient, ok = args[1].(string); !ok {
			return nil, fmt.Errorf("invalid recipient type")
		}

		// Get metadata JSON
		if metadataJSON, ok = args[2].(string); !ok {
			return nil, fmt.Errorf("invalid metadata type")
		}

		// Check if event exists
		_, exists := c.events[eventID]
		if !exists {
			log.Printf("Cannot mint NFT: Event %d not found", eventID)
			return json.Marshal(false)
		}

		// Parse metadata
		var metadata map[string]interface{}
		if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
			return nil, fmt.Errorf("invalid metadata JSON: %v", err)
		}

		c.nftCount++
		nftID := c.nftCount

		c.nfts[nftID] = models.NFT{
			ID:       nftID,
			EventID: fmt.Sprintf("%d", eventID),
			Owner:    recipient,
			Metadata: metadata,
		}
		
		log.Printf("Minted NFT %d for event %d, recipient %s", nftID, eventID, recipient)

		return json.Marshal(true)

	case "get_nft_count":
		return json.Marshal(c.nftCount)

	case "get_event_count":
		return json.Marshal(c.eventCount)

	default:
		return nil, fmt.Errorf("unknown method: %s", method)
	}
}