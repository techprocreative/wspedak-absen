-- ============================================
-- Seed Data - Create Admin User
-- ============================================

-- Insert admin user
-- Password: admin123 (bcrypt hash)
INSERT INTO public.users (
  id,
  email,
  password_hash,
  name,
  role,
  department,
  position,
  employee_id,
  phone,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@test.com',
  '$2a$10$YPZ3V3qGQXKnFCZYvWqGXeqp1N.zK8Oq0p7LmQv7HvQqP0UmqLqYe', -- admin123
  'System Administrator',
  'admin',
  'IT',
  'System Administrator',
  'ADM001',
  '+62123456789',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert HR user
INSERT INTO public.users (
  id,
  email,
  password_hash,
  name,
  role,
  department,
  position,
  employee_id,
  phone,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'hr@test.com',
  '$2a$10$YPZ3V3qGQXKnFCZYvWqGXeqp1N.zK8Oq0p7LmQv7HvQqP0UmqLqYe', -- admin123
  'HR Manager',
  'hr',
  'Human Resources',
  'HR Manager',
  'HR001',
  '+62123456788',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert Manager user
INSERT INTO public.users (
  id,
  email,
  password_hash,
  name,
  role,
  department,
  position,
  employee_id,
  phone,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'manager@test.com',
  '$2a$10$YPZ3V3qGQXKnFCZYvWqGXeqp1N.zK8Oq0p7LmQv7HvQqP0UmqLqYe', -- admin123
  'Department Manager',
  'manager',
  'Engineering',
  'Engineering Manager',
  'MGR001',
  '+62123456787',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert Employee user
INSERT INTO public.users (
  id,
  email,
  password_hash,
  name,
  role,
  department,
  position,
  employee_id,
  phone,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'employee@test.com',
  '$2a$10$YPZ3V3qGQXKnFCZYvWqGXeqp1N.zK8Oq0p7LmQv7HvQqP0UmqLqYe', -- admin123
  'Test Employee',
  'employee',
  'Engineering',
  'Software Developer',
  'EMP001',
  '+62123456786',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verify seed data
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users;
    RAISE NOTICE 'Seed completed! Total users: %', user_count;
END $$;
