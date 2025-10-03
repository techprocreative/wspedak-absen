-- ========================================
-- Create Admin User - SQL Script
-- ========================================
-- 
-- INSTRUCTIONS:
-- 1. First create user in Supabase Auth Dashboard
--    (Authentication → Users → Add user)
-- 2. Copy the User ID
-- 3. Replace 'YOUR_USER_ID_HERE' below with actual ID
-- 4. Update email, name as needed
-- 5. Run this script in SQL Editor
--

-- Create admin user in public.users table
INSERT INTO public.users (
  id,
  email,
  name,
  role,
  department,
  position,
  employee_id,
  metadata
)
VALUES (
  'YOUR_USER_ID_HERE',  -- ⚠️ REPLACE with User ID from Auth
  'admin@yourcompany.com',  -- Email (must match Auth user)
  'System Administrator',
  'admin',
  'IT',
  'System Administrator',
  'ADM001',
  jsonb_build_object(
    'is_system_admin', true,
    'created_by', 'setup_script',
    'setup_date', now()
  )
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = now();

-- Verify user was created
SELECT 
  id,
  email,
  name,
  role,
  department,
  position,
  created_at
FROM public.users
WHERE role = 'admin';

-- ========================================
-- Expected Output:
-- Should show 1 row with your admin user
-- ========================================
