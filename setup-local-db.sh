#!/bin/bash

# Setup script for local D1 database development
echo "Setting up local D1 database for options-tracker..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: Wrangler CLI is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Create local D1 database (if it doesn't exist)
echo "Creating local D1 database..."
if ! wrangler d1 list | grep -q "options-tracker-local"; then
    wrangler d1 create options-tracker-local
else
    echo "Database options-tracker-local already exists"
fi

# Apply migrations
echo "Applying database migrations..."
wrangler d1 migrations apply options-tracker-local --local

echo "Local database setup completed!"
echo ""
echo "To run the development server with the local database:"
echo "npm run dev"
echo ""
echo "To view the local database:"
echo "wrangler d1 execute options-tracker-local --local --command='SELECT * FROM stock_snapshots LIMIT 5;' --json"
echo ""
echo "Database ID created: $(wrangler d1 list | grep options-tracker-local | cut -d' ' -f1 2>/dev/null || echo 'Check wrangler d1 list')"
