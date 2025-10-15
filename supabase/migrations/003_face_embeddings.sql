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

-- Add RLS policies
ALTER TABLE face_embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS face_embeddings_view_own ON face_embeddings;
DROP POLICY IF EXISTS face_embeddings_insert_own ON face_embeddings;
DROP POLICY IF EXISTS face_embeddings_update_own ON face_embeddings;
DROP POLICY IF EXISTS face_embeddings_delete_own ON face_embeddings;
DROP POLICY IF EXISTS face_embeddings_admin_all ON face_embeddings;

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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_face_embeddings_updated_at ON face_embeddings;
CREATE TRIGGER update_face_embeddings_updated_at
  BEFORE UPDATE ON face_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a function to limit face embeddings per user (max 3)
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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS enforce_face_embeddings_limit ON face_embeddings;
CREATE TRIGGER enforce_face_embeddings_limit
  BEFORE INSERT ON face_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION check_face_embeddings_limit();

-- Add comment for documentation
COMMENT ON TABLE face_embeddings IS 'Stores face recognition embeddings for users';
COMMENT ON COLUMN face_embeddings.user_id IS 'Reference to the user who owns this face embedding';
COMMENT ON COLUMN face_embeddings.embedding IS 'The face descriptor/embedding as a JSON array of floats';
COMMENT ON COLUMN face_embeddings.quality IS 'Quality score of the face embedding (0-1)';
COMMENT ON COLUMN face_embeddings.metadata IS 'Additional metadata about the embedding (e.g., device info, enrollment method)';
COMMENT ON COLUMN face_embeddings.is_active IS 'Whether this embedding is active and should be used for matching';
