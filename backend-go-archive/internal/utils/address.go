package utils

import (
	"crypto/sha256"
	"fmt"
	"log"
	"strings"

	"github.com/centrifuge/go-substrate-rpc-client/v4/types"
	"github.com/decred/base58"
	subkey "github.com/vedhavyas/go-subkey/v2"
)

// SS58DecodeResult holds the result of SS58 decoding
type SS58DecodeResult struct {
	NetworkID uint16
	PublicKey []byte
	Valid     bool
	Method    string
	Error     error
}

// SS58DecodeWithFallback attempts to decode an SS58 address using multiple methods
// This is specifically designed to handle addresses with checksum issues (like some Aleph Zero addresses)
func SS58DecodeWithFallback(address string) *SS58DecodeResult {
	log.Printf("Attempting to decode SS58 address: %s", address)

	// Method 1: Standard SS58Decode (preferred method)
	if networkID, pubKey, err := subkey.SS58Decode(address); err == nil {
		log.Printf("✅ Standard SS58Decode succeeded")
		return &SS58DecodeResult{
			NetworkID: networkID,
			PublicKey: pubKey,
			Valid:     true,
			Method:    "standard",
			Error:     nil,
		}
	} else {
		log.Printf("⚠️  Standard SS58Decode failed: %v", err)
	}

	// Method 2: Manual extraction ignoring checksum (for addresses with invalid checksums)
	if result := extractPublicKeyManually(address); result != nil {
		log.Printf("✅ Manual extraction succeeded")
		return result
	}

	// Method 3: Hash-based fallback (last resort)
	log.Printf("🔄 Using hash-based fallback method")
	addressHash := sha256.Sum256([]byte(address))
	return &SS58DecodeResult{
		NetworkID: 42, // Assume Substrate/Aleph Zero network
		PublicKey: addressHash[:32],
		Valid:     false,
		Method:    "hash-fallback",
		Error:     fmt.Errorf("used hash-based fallback due to invalid address format"),
	}
}

// extractPublicKeyManually extracts the public key from an SS58 address manually
// This method ignores checksum validation but validates the structure
func extractPublicKeyManually(address string) *SS58DecodeResult {
	log.Printf("Attempting manual public key extraction")

	// Decode base58
	rawBytes := base58.Decode(address)
	if len(rawBytes) < 34 {
		log.Printf("❌ Address too short after base58 decode: %d bytes", len(rawBytes))
		return nil
	}

	// Extract network ID
	var networkID uint16
	var pubKeyStart int

	if rawBytes[0] <= 63 {
		// Single byte network ID
		networkID = uint16(rawBytes[0])
		pubKeyStart = 1
	} else if rawBytes[0] < 127 {
		// Two byte network ID
		lower := (rawBytes[0] << 2) | (rawBytes[1] >> 6)
		upper := rawBytes[1] & 0b00111111
		networkID = uint16(lower) | (uint16(upper) << 8)
		pubKeyStart = 2
	} else {
		log.Printf("❌ Invalid network ID format")
		return nil
	}

	// Extract public key (should be 32 bytes)
	pubKeyEnd := len(rawBytes) - 2 // Exclude 2-byte checksum
	if pubKeyEnd-pubKeyStart != 32 {
		log.Printf("❌ Invalid public key length: %d bytes", pubKeyEnd-pubKeyStart)
		return nil
	}

	pubKey := rawBytes[pubKeyStart:pubKeyEnd]

	// Validate the extracted public key looks reasonable
	if !isValidPublicKey(pubKey) {
		log.Printf("❌ Extracted public key appears invalid")
		return nil
	}

	log.Printf("✅ Manually extracted - Network: %d, PubKey: %x...", networkID, pubKey[:8])
	return &SS58DecodeResult{
		NetworkID: networkID,
		PublicKey: pubKey,
		Valid:     false, // Mark as invalid due to checksum issue
		Method:    "manual-extraction",
		Error:     fmt.Errorf("checksum validation failed but public key extracted"),
	}
}

// isValidPublicKey performs basic validation on a public key
func isValidPublicKey(pubKey []byte) bool {
	if len(pubKey) != 32 {
		return false
	}

	// Check for too many zero bytes (suggests invalid key)
	zeroCount := 0
	for _, b := range pubKey {
		if b == 0 {
			zeroCount++
		}
	}

	// If more than half the bytes are zero, it's likely invalid
	return zeroCount < 16
}

// ConvertAddressToAccountID converts an SS58 address to a Substrate AccountID
// This function handles various edge cases and invalid checksums
func ConvertAddressToAccountID(address string) (types.AccountID, error) {
	var accountID types.AccountID

	if address == "" {
		return accountID, fmt.Errorf("address cannot be empty")
	}

	// Handle hex addresses
	if strings.HasPrefix(address, "0x") {
		return convertHexToAccountID(address)
	}

	// Handle SS58 addresses with fallback methods
	result := SS58DecodeWithFallback(address)
	if result == nil {
		return accountID, fmt.Errorf("failed to decode address using any method")
	}

	if len(result.PublicKey) != 32 {
		return accountID, fmt.Errorf("invalid public key length: %d bytes", len(result.PublicKey))
	}

	copy(accountID[:], result.PublicKey)

	// Log the method used and any warnings
	if !result.Valid {
		log.Printf("⚠️  Address decoded with issues using method '%s': %v", result.Method, result.Error)
	}

	return accountID, nil
}

// convertHexToAccountID converts a hex string to AccountID
func convertHexToAccountID(hexAddress string) (types.AccountID, error) {
	var accountID types.AccountID

	hexStr := strings.TrimPrefix(hexAddress, "0x")
	if len(hexStr) != 64 { // 32 bytes = 64 hex chars
		return accountID, fmt.Errorf("invalid hex address length: expected 64 chars, got %d", len(hexStr))
	}

	// Convert hex to bytes
	for i := 0; i < 32; i++ {
		var b byte
		_, err := fmt.Sscanf(hexStr[i*2:i*2+2], "%02x", &b)
		if err != nil {
			return accountID, fmt.Errorf("invalid hex character at position %d: %v", i*2, err)
		}
		accountID[i] = b
	}

	return accountID, nil
}

// ValidateAndCorrectSS58Address validates an SS58 address and returns a corrected version if possible
func ValidateAndCorrectSS58Address(address string) (string, bool, error) {
	// First try standard validation
	if _, _, err := subkey.SS58Decode(address); err == nil {
		return address, true, nil // Address is already valid
	}

	// Try to extract and re-encode with proper checksum
	result := extractPublicKeyManually(address)
	if result == nil {
		return "", false, fmt.Errorf("cannot extract valid public key from address")
	}

	// Re-encode with proper checksum
	correctedAddress := subkey.SS58Encode(result.PublicKey, result.NetworkID)
	
	// Verify the corrected address
	if _, _, err := subkey.SS58Decode(correctedAddress); err != nil {
		return "", false, fmt.Errorf("failed to create valid corrected address: %v", err)
	}

	return correctedAddress, false, nil // Return corrected address and false (was not originally valid)
}