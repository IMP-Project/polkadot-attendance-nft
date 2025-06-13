package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
)

// ContractMethodInfo captures the essential information about contract methods
type ContractMethodInfo struct {
	Name     string `json:"name"`
	Selector string `json:"selector"`
	Mutates  bool   `json:"mutates"`
	Args     []struct {
		Name string `json:"label"`
		Type struct {
			Type int    `json:"type"`
			Name string `json:"displayName"`
		} `json:"type"`
	} `json:"args"`
}

// SimpleMetadata is a simplified version of contract metadata
type SimpleMetadata struct {
	Source struct {
		Language string `json:"language"`
		Compiler string `json:"compiler"`
	} `json:"source"`
	Constructors []ContractMethodInfo `json:"constructors"`
	Methods      []ContractMethodInfo `json:"methods"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: metadata_dump <contract_metadata.json> [output_file.json]")
		os.Exit(1)
	}

	metadataPath := os.Args[1]
	var outputPath string
	if len(os.Args) >= 3 {
		outputPath = os.Args[2]
	} else {
		outputPath = "metadata_dump.json"
	}

	// Read the contract metadata
	data, err := ioutil.ReadFile(metadataPath)
	if err != nil {
		log.Fatalf("Failed to read metadata file: %v", err)
	}

	// Parse the JSON
	var metadata map[string]interface{}
	if err := json.Unmarshal(data, &metadata); err != nil {
		log.Fatalf("Failed to parse metadata JSON: %v", err)
	}

	// Create a simplified version
	simplified := SimpleMetadata{}

	// Copy source info
	if source, ok := metadata["source"].(map[string]interface{}); ok {
		if language, ok := source["language"].(string); ok {
			simplified.Source.Language = language
		}
		if compiler, ok := source["compiler"].(string); ok {
			simplified.Source.Compiler = compiler
		}
	}

	// Get constructors and methods
	if spec, ok := metadata["spec"].(map[string]interface{}); ok {
		// Extract constructors
		if constructors, ok := spec["constructors"].([]interface{}); ok {
			for _, c := range constructors {
				if constructor, ok := c.(map[string]interface{}); ok {
					method := extractMethodInfo(constructor)
					simplified.Constructors = append(simplified.Constructors, method)
				}
			}
		}

		// Extract methods
		if messages, ok := spec["messages"].([]interface{}); ok {
			for _, m := range messages {
				if message, ok := m.(map[string]interface{}); ok {
					method := extractMethodInfo(message)
					simplified.Methods = append(simplified.Methods, method)
				}
			}
		}
	}

	// Write simplified metadata to output file
	simplifiedData, err := json.MarshalIndent(simplified, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal simplified metadata: %v", err)
	}

	// Create directory if it doesn't exist
	dir := filepath.Dir(outputPath)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Fatalf("Failed to create output directory: %v", err)
		}
	}

	if err := ioutil.WriteFile(outputPath, simplifiedData, 0644); err != nil {
		log.Fatalf("Failed to write output file: %v", err)
	}

	fmt.Printf("Simplified metadata written to %s\n", outputPath)
	
	// Print method selectors for easy reference
	fmt.Println("\nMethod Selectors:")
	for _, m := range simplified.Methods {
		fmt.Printf("%s: %s\n", m.Name, m.Selector)
	}
}

func extractMethodInfo(method map[string]interface{}) ContractMethodInfo {
	info := ContractMethodInfo{}
	
	if label, ok := method["label"].(string); ok {
		info.Name = label
	}
	
	if selector, ok := method["selector"].(string); ok {
		info.Selector = selector
	}
	
	if mutates, ok := method["mutates"].(bool); ok {
		info.Mutates = mutates
	}
	
	// Extract argument info
	if args, ok := method["args"].([]interface{}); ok {
		for _, a := range args {
			if arg, ok := a.(map[string]interface{}); ok {
				argInfo := struct {
					Name string `json:"label"`
					Type struct {
						Type int    `json:"type"`
						Name string `json:"displayName"`
					} `json:"type"`
				}{}
				
				if label, ok := arg["label"].(string); ok {
					argInfo.Name = label
				}
				
				if typeInfo, ok := arg["type"].(map[string]interface{}); ok {
					if typeName, ok := typeInfo["displayName"].([]interface{}); ok && len(typeName) > 0 {
						if name, ok := typeName[0].(string); ok {
							argInfo.Type.Name = name
						}
					}
					
					if typeVal, ok := typeInfo["type"].(float64); ok {
						argInfo.Type.Type = int(typeVal)
					}
				}
				
				info.Args = append(info.Args, argInfo)
			}
		}
	}
	
	return info
} 