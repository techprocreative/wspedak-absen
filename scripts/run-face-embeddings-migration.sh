#!/bin/bash

# ============================================
# Run Face Embeddings Migration Script
# ============================================

echo "🚀 Face Embeddings Migration Script"
echo "===================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it using one of these methods:"
    echo "1. Export it: export DATABASE_URL='your-database-url'"
    echo "2. Create .env file with: DATABASE_URL=your-database-url"
    echo "3. Pass it directly: DATABASE_URL='your-url' ./run-face-embeddings-migration.sh"
    exit 1
fi

# Migration file path
MIGRATION_FILE="supabase/migrations/003_face_embeddings_idempotent.sql"
CHECK_FILE="supabase/check-face-embeddings.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ ERROR: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📋 Pre-Migration Status Check:"
echo "------------------------------"
# Run check before migration
psql "$DATABASE_URL" -f "$CHECK_FILE" 2>/dev/null || echo "Table doesn't exist yet (this is normal for first run)"

echo ""
echo "🔧 Running Migration..."
echo "------------------------------"
# Run the migration
if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed! Check the error messages above."
    exit 1
fi

echo ""
echo "📋 Post-Migration Status Check:"
echo "------------------------------"
# Run check after migration
psql "$DATABASE_URL" -f "$CHECK_FILE"

echo ""
echo "✨ Migration Complete!"
echo ""
echo "Next steps:"
echo "1. Test face enrollment: npm run dev"
echo "2. Open http://localhost:3000/test-face-recognition.html"
echo "3. Run the test suite to verify everything works"
