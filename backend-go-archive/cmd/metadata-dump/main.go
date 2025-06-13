package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/polkadot"
)

func main() {
	// Set up logging
	log.SetOutput(os.Stdout)
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	
	// Try to load the contract metadata
	metadataPath := "../contracts/target/ink/attendance_nft.json"
	if len(os.Args) > 1 {
		metadataPath = os.Args[1]
	}
	
	log.Printf("Loading contract metadata from %s", metadataPath)
	metadata, err := polkadot.LoadContractMetadata(metadataPath)
	if err != nil {
		log.Fatalf("Failed to load contract metadata: %v", err)
	}
	
	log.Printf("Successfully loaded metadata for contract: %s v%s", 
		metadata.Contract.Name, 
		metadata.Contract.Version)
	
	// Print contract info
	fmt.Printf("Contract: %s v%s\n", metadata.Contract.Name, metadata.Contract.Version)
	fmt.Printf("Authors: %v\n", metadata.Contract.Authors)
	fmt.Printf("Description: %s\n\n", metadata.Contract.Description)
	
	// Print available methods
	fmt.Println("Available methods:")
	for i, message := range metadata.V1.Spec.Messages {
		fmt.Printf("%d. %s\n", i+1, message.Name)
		fmt.Printf("   Selector: %s\n", message.Selector)
		fmt.Printf("   Mutates: %t\n", message.Mutates)
		fmt.Printf("   Arguments: ")
		if len(message.Args) == 0 {
			fmt.Printf("None\n")
		} else {
			fmt.Printf("\n")
			for j, arg := range message.Args {
				fmt.Printf("     %d. %s: %v\n", j+1, arg.Name, arg.Type.DisplayName)
			}
		}
		fmt.Printf("   Return Type: %v\n", message.ReturnType.DisplayName)
		fmt.Printf("   Docs: %v\n\n", message.Docs)
	}
	
	// Print available constructors
	fmt.Println("Available constructors:")
	for i, constructor := range metadata.V1.Spec.Constructors {
		fmt.Printf("%d. %s\n", i+1, constructor.Name)
		fmt.Printf("   Selector: %s\n", constructor.Selector)
		fmt.Printf("   Arguments: ")
		if len(constructor.Args) == 0 {
			fmt.Printf("None\n")
		} else {
			fmt.Printf("\n")
			for j, arg := range constructor.Args {
				fmt.Printf("     %d. %s: %v\n", j+1, arg.Name, arg.Type.DisplayName)
			}
		}
		fmt.Printf("   Docs: %v\n\n", constructor.Docs)
	}
	
	// Print available events
	fmt.Println("Available events:")
	for i, event := range metadata.V1.Spec.Events {
		fmt.Printf("%d. %s\n", i+1, event.Name)
		fmt.Printf("   Arguments: ")
		if len(event.Args) == 0 {
			fmt.Printf("None\n")
		} else {
			fmt.Printf("\n")
			for j, arg := range event.Args {
				fmt.Printf("     %d. %s: %v (indexed: %t)\n", j+1, arg.Name, arg.Type.DisplayName, arg.Indexed)
			}
		}
		fmt.Printf("   Docs: %v\n\n", event.Docs)
	}
	
	// Save prettified JSON to a file for easier inspection
	prettyJSON, err := json.MarshalIndent(metadata, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal metadata to JSON: %v", err)
	}
	
	err = os.WriteFile("metadata_dump.json", prettyJSON, 0644)
	if err != nil {
		log.Fatalf("Failed to write metadata to file: %v", err)
	}
	
	log.Printf("Saved prettified metadata to metadata_dump.json")
} 