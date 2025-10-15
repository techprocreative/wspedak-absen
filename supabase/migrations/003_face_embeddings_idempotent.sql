-- ============================================
-- Face Embeddings Table - Idempotent Migration
-- ============================================
-- This migration is safe to run multiple times
-- It checks for existing objects before creating

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create face_embeddings table for storing face recognition data
CREATE TABLE IF NOT EXISTS face_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  embedding JSONB NOT NULL,
  quality FLOAT DEFAULT 0.8 CHECK (quality >= 0 AND quality <= 1),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_face_embeddings_user_id ON face_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_active ON face_embeddings(is_active);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_created_at ON face_embeddings(created_at DESC);

-- Add RLS policies (only if not already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'face_embeddings' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE face_embeddings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist (to ensure clean state)
DROP POLICY IF EXISTS face_embeddings_view_own ON face_embeddings;
DROP POLICY IF EXISTS face_embeddings_insert_own ON face_embeddings;
DROP POLICY IF EXISTS face_embeddings_update_own ON face_embeddings;
DROP POLICY IF EXISTS face_embeddings_delete_own ON face_embeddings;
DROP POLICY IF EXISTS face_embeddings_admin_all ON face_embeddings;

-- Recreate policies
-- Policy: Users can view their own face embeddings
CREATE POLICY face_embeddings_view_own ON face_embeddings
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: Users can insert their own face embeddings
CREATE POLICY face_embeddings_insert_own ON face_embeddings
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can update their own face embeddings
CREATE POLICY face_embeddings_update_own ON face_embeddings
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Policy: Users can delete their own face embeddings
CREATE POLICY face_embeddings_delete_own ON face_embeddings
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Policy: Admins can do everything
CREATE POLICY face_embeddings_admin_all ON face_embeddings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger for updated_at
DROP TRIGGER IF EXISTS update_face_embeddings_updated_at ON face_embeddings;
CREATE TRIGGER update_face_embeddings_updated_at
  BEFORE UPDATE ON face_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create or replace function to limit face embeddings per user (max 3)
CREATE OR REPLACE FUNCTION check_face_embeddings_limit()
RETURNS TRIGGER AS $$
DECLARE
  count_embeddings INT;
BEGIN
  SELECT COUNT(*) INTO count_embeddings
  FROM face_embeddings
  WHERE user_id = NEW.user_id AND is_active = true;
  
  IF count_embeddings >= 3 THEN
    RAISE EXCEPTION 'Maximum number of face enrollments (3) reached for this user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger for face embeddings limit
DROP TRIGGER IF EXISTS enforce_face_embeddings_limit ON face_embeddings;
CREATE TRIGGER enforce_face_embeddings_limit
  BEFORE INSERT ON face_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION check_face_embeddings_limit();

-- Add helpful comments for documentation
COMMENT ON TABLE face_embeddings IS 'Stores face recognition embeddings for users';
COMMENT ON COLUMN face_embeddings.user_id IS 'Reference to the user who owns this face embedding';
COMMENT ON COLUMN face_embeddings.embedding IS 'The face descriptor/embedding as a JSON array of floats';
COMMENT ON COLUMN face_embeddings.quality IS 'Quality score of the face embedding (0-1)';
COMMENT ON COLUMN face_embeddings.metadata IS 'Additional metadata about the embedding (e.g., device info, enrollment method)';
COMMENT ON COLUMN face_embeddings.is_active IS 'Whether this embedding is active and should be used for matching';

-- Grant appropriate permissions (adjust based on your needs)
-- GRANT ALL ON face_embeddings TO authenticated;
-- GRANT USAGE ON SEQUENCE face_embeddings_id_seq TO authenticated;

-- Create a view for easier querying (optional)
CREATE OR REPLACE VIEW active_face_embeddings AS
SELECT 
  id,
  user_id,
  embedding,
  quality,
  metadata,
  created_at,
  updated_at
FROM face_embeddings
WHERE is_active = true;

-- Grant permissions on the view
-- GRANT SELECT ON active_face_embeddings TO authenticated;

-- ============================================
-- Verification Queries (Run these to check)
-- ============================================
-- Check if table exists:
-- SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'face_embeddings');

-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'face_embeddings';

-- Check policies:
-- SELECT policyname FROM pg_policies WHERE tablename = 'face_embeddings';

-- Check triggers:
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'face_embeddings';

-- ============================================
-- Rollback Script (If needed)
-- ============================================
-- To completely remove everything created by this migration, run:
/*
DROP VIEW IF EXISTS active_face_embeddings;
DROP TRIGGER IF EXISTS enforce_face_embeddings_limit ON face_embeddings;
DROP TRIGGER IF EXISTS update_face_embeddings_updated_at ON face_embeddings;
DROP FUNCTION IF EXISTS check_face_embeddings_limit();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS face_embeddings CASCADE;
*/
