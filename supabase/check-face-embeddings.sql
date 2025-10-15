-- ============================================
-- Check Face Embeddings Table Status
-- ============================================
-- Run this script to check the current state of face_embeddings setup

-- Check if table exists
SELECT 
  'Table Exists' as check_item,
  EXISTS (SELECT FROM pg_tables WHERE tablename = 'face_embeddings') as status;

-- Check if RLS is enabled
SELECT 
  'RLS Enabled' as check_item,
  rowsecurity as status
FROM pg_tables 
WHERE tablename = 'face_embeddings';

-- List all indexes
SELECT 
  'Index: ' || indexname as check_item,
  'EXISTS' as status
FROM pg_indexes 
WHERE tablename = 'face_embeddings';

-- List all policies
SELECT 
  'Policy: ' || policyname as check_item,
  'EXISTS' as status
FROM pg_policies 
WHERE tablename = 'face_embeddings';

-- List all triggers
SELECT 
  'Trigger: ' || trigger_name as check_item,
  'EXISTS' as status
FROM information_schema.triggers 
WHERE event_object_table = 'face_embeddings';

-- Check table structure
SELECT 
  'Column: ' || column_name as check_item,
  data_type || COALESCE(' DEFAULT ' || column_default, '') as status
FROM information_schema.columns
WHERE table_name = 'face_embeddings'
ORDER BY ordinal_position;

-- Check row count
SELECT 
  'Total Rows' as check_item,
  COUNT(*)::text as status
FROM face_embeddings;

-- Check active embeddings count
SELECT 
  'Active Embeddings' as check_item,
  COUNT(*)::text as status
FROM face_embeddings
WHERE is_active = true;

-- Check users with embeddings
SELECT 
  'Users with Embeddings' as check_item,
  COUNT(DISTINCT user_id)::text as status
FROM face_embeddings
WHERE is_active = true;
