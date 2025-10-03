#!/bin/bash

# ============================================
# Rollback Script
# Emergency rollback to previous version
# ============================================

set -e

echo "⚠️  ROLLBACK: Reverting to previous version"
echo ""

# Check if we're using Vercel
if command -v vercel &> /dev/null; then
  echo "🔄 Rolling back Vercel deployment..."
  vercel rollback --yes
  echo "✅ Vercel rollback complete"
fi

# Check if we're using PM2
if command -v pm2 &> /dev/null; then
  echo "🔄 Reloading PM2 process..."
  pm2 reload attendance
  echo "✅ PM2 reload complete"
fi

# Check if we're using Docker
if command -v docker &> /dev/null; then
  echo "🔄 Restarting Docker container..."
  docker-compose restart
  echo "✅ Docker restart complete"
fi

echo ""
echo "✅ Rollback completed!"
echo "📝 Please check application health"
echo ""
