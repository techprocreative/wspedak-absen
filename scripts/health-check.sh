#!/bin/bash

# ============================================
# Health Check Script
# Tests if the deployed application is working
# ============================================

set -e

# Default to localhost, or use provided URL
BASE_URL="${1:-http://localhost:3000}"

echo "🏥 Running health checks on: $BASE_URL"
echo ""

# Check 1: Homepage
echo "1️⃣  Checking homepage..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$STATUS" = "200" ]; then
  echo "✅ Homepage OK (Status: $STATUS)"
else
  echo "❌ Homepage failed (Status: $STATUS)"
  exit 1
fi
echo ""

# Check 2: API Health
echo "2️⃣  Checking API health..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
if [ "$STATUS" = "200" ]; then
  echo "✅ API Health OK (Status: $STATUS)"
else
  echo "⚠️  API Health endpoint not available (Status: $STATUS)"
fi
echo ""

# Check 3: Login page
echo "3️⃣  Checking login page..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/login")
if [ "$STATUS" = "200" ]; then
  echo "✅ Login page OK (Status: $STATUS)"
else
  echo "❌ Login page failed (Status: $STATUS)"
  exit 1
fi
echo ""

# Check 4: Face models
echo "4️⃣  Checking face recognition models..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/models/tiny_face_detector_model-weights_manifest.json")
if [ "$STATUS" = "200" ]; then
  echo "✅ Face models accessible (Status: $STATUS)"
else
  echo "⚠️  Face models not found (Status: $STATUS)"
  echo "   Run: ./scripts/download-face-models.sh"
fi
echo ""

# Check 5: Database connectivity (via login API)
echo "5️⃣  Checking database connectivity..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

if echo "$RESPONSE" | grep -q "success"; then
  echo "✅ Database connection OK (Login successful)"
else
  echo "❌ Database connection failed"
  echo "Response: $RESPONSE"
  exit 1
fi
echo ""

echo "🎉 All health checks passed!"
echo "✅ Application is healthy and ready to serve traffic"
