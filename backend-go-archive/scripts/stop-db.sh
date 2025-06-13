#!/bin/bash

# Stop PostgreSQL database services using Docker Compose

# Directory where docker-compose.yml is located
cd "$(dirname "$0")/.."

echo "Stopping PostgreSQL services..."
docker-compose down

echo "PostgreSQL services stopped." 