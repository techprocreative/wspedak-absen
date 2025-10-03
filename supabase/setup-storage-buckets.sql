-- ========================================
-- Setup Storage Buckets for Data Management
-- Creates buckets for exports, imports, and backups
-- ========================================

-- Create exports bucket (for exported files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  true, -- Public for easier downloads
  52428800, -- 50MB limit
  ARRAY['text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

-- Create imports bucket (for uploaded files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imports',
  'imports',
  false, -- Private
  10485760, -- 10MB limit
  ARRAY['text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

-- Create backups bucket (for database backups)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups',
  false, -- Private
  104857600, -- 100MB limit
  ARRAY['application/zip', 'application/x-zip-compressed', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- Row Level Security Policies
-- ========================================

-- Exports bucket policies
DROP POLICY IF EXISTS "Admins can upload exports" ON storage.objects;
CREATE POLICY "Admins can upload exports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'exports' AND
    auth.role() = 'authenticated' AND
    public.is_admin_role()
  );

DROP POLICY IF EXISTS "Public can view exports" ON storage.objects;
CREATE POLICY "Public can view exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports'
  );

DROP POLICY IF EXISTS "Admins can delete exports" ON storage.objects;
CREATE POLICY "Admins can delete exports" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'exports' AND
    public.is_admin_role()
  );

-- Imports bucket policies
DROP POLICY IF EXISTS "Admins can upload imports" ON storage.objects;
CREATE POLICY "Admins can upload imports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'imports' AND
    auth.role() = 'authenticated' AND
    public.is_admin_role()
  );

DROP POLICY IF EXISTS "Admins can view imports" ON storage.objects;
CREATE POLICY "Admins can view imports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'imports' AND
    public.is_admin_role()
  );

DROP POLICY IF EXISTS "Admins can delete imports" ON storage.objects;
CREATE POLICY "Admins can delete imports" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'imports' AND
    public.is_admin_role()
  );

-- Backups bucket policies
DROP POLICY IF EXISTS "Admins can upload backups" ON storage.objects;
CREATE POLICY "Admins can upload backups" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'backups' AND
    auth.role() = 'authenticated' AND
    public.is_admin_role()
  );

DROP POLICY IF EXISTS "Admins can view backups" ON storage.objects;
CREATE POLICY "Admins can view backups" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'backups' AND
    public.is_admin_role()
  );

DROP POLICY IF EXISTS "Admins can delete backups" ON storage.objects;
CREATE POLICY "Admins can delete backups" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'backups' AND
    public.is_admin_role()
  );

-- ========================================
-- Verify Setup
-- ========================================

-- Check buckets created
SELECT 
  id,
  name,
  public,
  file_size_limit,
  '✅ Created' as status
FROM storage.buckets
WHERE id IN ('exports', 'imports', 'backups');

-- Check policies
SELECT 
  policyname,
  tablename,
  '✅ Created' as status
FROM pg_policies 
WHERE tablename = 'objects'
  AND (policyname LIKE '%exports%' 
    OR policyname LIKE '%imports%' 
    OR policyname LIKE '%backups%');

-- ========================================
-- Expected Results:
-- ✅ 3 buckets: exports (public, 50MB), imports (private, 10MB), backups (private, 100MB)
-- ✅ 9 policies: 3 for each bucket (insert, select, delete)
-- ========================================
