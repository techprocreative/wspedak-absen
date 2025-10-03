#!/bin/bash

# Seed Admin User Script
# This script creates the first admin user via API

echo "==================================="
echo "👤 Creating Admin User"
echo "==================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with your configuration"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check required variables
if [ -z "$ADMIN_SEED_TOKEN" ]; then
    echo "❌ Error: ADMIN_SEED_TOKEN not set in .env.local"
    exit 1
fi

if [ -z "$ADMIN_EMAIL" ]; then
    echo "❌ Error: ADMIN_EMAIL not set in .env.local"
    exit 1
fi

if [ -z "$ADMIN_PASSWORD" ]; then
    echo "❌ Error: ADMIN_PASSWORD not set in .env.local"
    exit 1
fi

# Default values
SERVER_URL="${SERVER_URL:-http://localhost:3000}"
ADMIN_NAME="${ADMIN_NAME:-System Administrator}"

echo "📋 Configuration:"
echo "   Server: $SERVER_URL"
echo "   Email: $ADMIN_EMAIL"
echo "   Name: $ADMIN_NAME"
echo ""

# Check if server is running
echo "🔍 Checking if server is running..."
if ! curl -s -f "$SERVER_URL/api/health" > /dev/null; then
    echo "❌ Error: Server is not running at $SERVER_URL"
    echo "Please start the server first with: npm run dev"
    exit 1
fi
echo "✅ Server is running"
echo ""

# Create admin user
echo "🚀 Creating admin user..."
RESPONSE=$(curl -s -X POST "$SERVER_URL/api/admin/seed" \
    -H "Authorization: Bearer $ADMIN_SEED_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$ADMIN_EMAIL\",
        \"password\": \"$ADMIN_PASSWORD\",
        \"name\": \"$ADMIN_NAME\"
    }")

# Check response
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Admin user created successfully!"
    echo ""
    echo "📧 Email: $ADMIN_EMAIL"
    echo "🔑 Password: (as configured in .env.local)"
    echo ""
    echo "🎉 You can now login at: $SERVER_URL/admin/login"
else
    echo "❌ Failed to create admin user"
    echo ""
    echo "Response:"
    echo "$RESPONSE"
    echo ""
    echo "Possible reasons:"
    echo "- User might already exist"
    echo "- Invalid credentials in .env.local"
    echo "- Database not setup correctly"
fi

echo ""
echo "==================================="
