-- ========================================
-- Add Audit Logs Table
-- For tracking admin activities and data management operations
-- ========================================

-- Create audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON public.audit_logs(resource);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_action_idx ON public.audit_logs(user_id, action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for audit logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin_role());

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- ========================================
-- Verify Setup
-- ========================================

-- Check table created
SELECT 
  table_name,
  '✅ Created' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'audit_logs';

-- Check indexes
SELECT 
  indexname,
  '✅ Created' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'audit_logs';

-- Check policies
SELECT 
  policyname,
  '✅ Created' as status
FROM pg_policies 
WHERE tablename = 'audit_logs';

-- Test insert (optional)
-- INSERT INTO audit_logs (user_id, action, resource, details)
-- VALUES (auth.uid(), 'TEST', 'system', '{"test": true}'::jsonb);

-- ========================================
-- Expected Results:
-- ✅ 1 table: audit_logs
-- ✅ 5 indexes
-- ✅ 3 policies
-- ========================================
