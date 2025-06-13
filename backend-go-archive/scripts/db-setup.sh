#!/bin/bash

# This script tests the PostgreSQL connection and verifies the database is ready

# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_NAME=attendance_nft
export DB_SSLMODE=disable

echo "Testing PostgreSQL connection..."

# Wait for PostgreSQL to be ready
MAX_RETRIES=30
RETRY_INTERVAL=2
retries=0
while [ $retries -lt $MAX_RETRIES ]; do
    if pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t 1; then
        echo "PostgreSQL is ready!"
        break
    fi
    retries=$((retries+1))
    echo "Waiting for PostgreSQL to be ready... ($retries/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
done

if [ $retries -eq $MAX_RETRIES ]; then
    echo "Error: PostgreSQL not ready after $MAX_RETRIES attempts. Exiting."
    exit 1
fi

# Build and run the database migration test tool
echo "Building migration test tool..."
go build -o bin/db-test ./cmd/db-test

if [ $? -ne 0 ]; then
    echo "Error: Failed to build migration test tool. Exiting."
    exit 1
fi

echo "Running database migrations..."
./bin/db-test

if [ $? -ne 0 ]; then
    echo "Error: Migration test failed. Exiting."
    exit 1
fi

echo "Database setup complete!" 