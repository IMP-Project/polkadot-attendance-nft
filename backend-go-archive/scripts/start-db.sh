#!/bin/bash

# Start PostgreSQL database using Docker Compose

# Directory where docker-compose.yml is located
cd "$(dirname "$0")/.."

echo "Starting PostgreSQL database..."
docker-compose up -d postgres

echo "Starting pgAdmin..."
docker-compose up -d pgadmin

echo "Waiting for services to be ready..."
sleep 5

echo "PostgreSQL is running at localhost:5432"
echo "pgAdmin is available at http://localhost:5050"
echo "  - Email: admin@example.com"
echo "  - Password: admin"
echo "  - Database: attendance_nft"
echo "  - Username: postgres"
echo "  - Password: postgres"

echo -e "\nTo stop the services, run: ./scripts/stop-db.sh" 