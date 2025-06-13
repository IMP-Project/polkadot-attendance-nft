#!/bin/bash

# Build the metadata dump tool
echo "Building metadata dump tool..."
cd "$(dirname "$0")/.."
go build -o bin/metadata_dump cmd/metadata_dump/main.go

# Run the tool on the contract metadata
echo "Running metadata dump tool..."
./bin/metadata_dump ../contracts/target/ink/attendance_nft.json metadata_dump.json

echo "Done! Metadata has been dumped to metadata_dump.json" 