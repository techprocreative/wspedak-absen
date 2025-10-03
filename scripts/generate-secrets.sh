#!/bin/bash

# Generate Secrets Script
# This script generates secure random secrets for your .env.local file

echo "==================================="
echo "🔐 Generating Secure Secrets"
echo "==================================="
echo ""

# Generate JWT_SECRET (32+ characters)
JWT_SECRET=$(openssl rand -base64 32)
echo "✅ JWT_SECRET (copy to .env.local):"
echo "JWT_SECRET=$JWT_SECRET"
echo ""

# Generate ENCRYPTION_KEY (exactly 32 characters)
ENCRYPTION_KEY=$(openssl rand -hex 16)
echo "✅ ENCRYPTION_KEY (copy to .env.local):"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""

# Generate ADMIN_SEED_TOKEN
ADMIN_SEED_TOKEN=$(openssl rand -base64 24)
echo "✅ ADMIN_SEED_TOKEN (copy to .env.local):"
echo "ADMIN_SEED_TOKEN=$ADMIN_SEED_TOKEN"
echo ""

# Generate SESSION_SECRET
SESSION_SECRET=$(openssl rand -base64 32)
echo "✅ SESSION_SECRET (copy to .env.local):"
echo "SESSION_SECRET=$SESSION_SECRET"
echo ""

echo "==================================="
echo "✅ Secrets Generated Successfully!"
echo "==================================="
echo ""
echo "📝 Next Steps:"
echo "1. Copy the values above to your .env.local file"
echo "2. Make sure to keep these secrets secure"
echo "3. Never commit them to git"
echo ""
