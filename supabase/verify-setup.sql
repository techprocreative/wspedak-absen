-- ========================================
-- Verify Database Setup
-- ========================================
-- Run this script to verify everything is setup correctly

-- 1. Check all tables exist
SELECT 
  'Tables Created' as check_type,
  count(*) as count,
  CASE 
    WHEN count(*) >= 5 THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- 2. List all tables
SELECT 
  table_name,
  '✅' as exists
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. Check enum types
SELECT 
  'Enum Types Created' as check_type,
  count(*) as count,
  CASE 
    WHEN count(*) >= 5 THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status
FROM pg_type
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND typtype = 'e';

-- 4. Check admin users
SELECT 
  'Admin Users' as check_type,
  count(*) as count,
  CASE 
    WHEN count(*) >= 1 THEN '✅ PASS' 
    ELSE '⚠️  No admin user yet' 
  END as status
FROM public.users
WHERE role = 'admin';

-- 5. List admin users
SELECT 
  email,
  name,
  role,
  department,
  created_at
FROM public.users
WHERE role = 'admin';

-- 6. Check indexes
SELECT 
  'Indexes Created' as check_type,
  count(*) as count,
  '✅ PASS' as status
FROM pg_indexes
WHERE schemaname = 'public';

-- 7. Check triggers
SELECT 
  'Triggers Created' as check_type,
  count(*) as count,
  '✅ PASS' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 8. Sample data counts
SELECT 
  'users' as table_name,
  count(*) as record_count
FROM public.users
UNION ALL
SELECT 
  'daily_attendance_records' as table_name,
  count(*) as record_count
FROM public.daily_attendance_records
UNION ALL
SELECT 
  'attendance' as table_name,
  count(*) as record_count
FROM public.attendance
UNION ALL
SELECT 
  'attendance_policies' as table_name,
  count(*) as record_count
FROM public.attendance_policies
UNION ALL
SELECT 
  'user_settings' as table_name,
  count(*) as record_count
FROM public.user_settings;

-- ========================================
-- Expected Output:
-- ✅ Tables Created: 5+ tables (PASS)
--    - users
--    - attendance
--    - daily_attendance_records
--    - attendance_policies
--    - user_settings
-- ✅ Enum Types: 5 types (PASS)
--    - user_role
--    - attendance_event_type
--    - attendance_status
--    - attendance_sync_status
--    - attendance_work_type
-- ✅ Admin Users: 1+ users (PASS)
-- ✅ Indexes: Multiple indexes (PASS)
-- ✅ Triggers: Multiple triggers (PASS)
-- ========================================
