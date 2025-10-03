-- Supabase schema bootstrap for v0-attendance
-- Run this script in the Supabase SQL Editor or via the CLI/psql once per project.

-- Required extensions -------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Enumerated types ----------------------------------------------------------
create type public.user_role as enum ('employee', 'admin', 'hr', 'manager');
create type public.attendance_event_type as enum ('check-in', 'check-out');
create type public.attendance_status as enum ('present', 'absent', 'late', 'early_leave', 'on_leave');
create type public.attendance_sync_status as enum ('pending', 'synced', 'error');
create type public.attendance_work_type as enum ('regular', 'overtime', 'holiday', 'weekend');

-- Helper to keep updated_at in sync ----------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Users table ---------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role public.user_role not null default 'employee',
  department text,
  position text,
  manager_id uuid references public.users(id),
  employee_id text unique,
  phone text,
  address text,
  start_date date,
  photo text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists users_manager_id_idx on public.users(manager_id);
create trigger set_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- Attendance policies -------------------------------------------------------
create table if not exists public.attendance_policies (
  id text primary key,
  work_start_time time not null,
  work_end_time time not null,
  late_threshold_minutes integer not null default 15,
  early_leave_threshold_minutes integer not null default 15,
  overtime_enabled boolean not null default true,
  weekend_work_enabled boolean not null default false,
  grace_period_minutes integer not null default 0,
  workdays smallint[] not null default array[1,2,3,4,5],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create trigger set_attendance_policies_updated_at before update on public.attendance_policies
  for each row execute function public.set_updated_at();

-- Daily attendance records --------------------------------------------------
create table if not exists public.daily_attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  clock_in_location jsonb,
  clock_out_location jsonb,
  location jsonb,
  clock_in_photo text,
  clock_out_photo text,
  photos text[],
  status public.attendance_status not null default 'present',
  absence_reason text,
  notes text,
  work_type public.attendance_work_type not null default 'regular',
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  sync_status public.attendance_sync_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint daily_attendance_user_date_unique unique (user_id, date)
);
create index if not exists daily_attendance_user_date_idx on public.daily_attendance_records (user_id, date desc);
create index if not exists daily_attendance_status_idx on public.daily_attendance_records (status);
create index if not exists daily_attendance_sync_idx on public.daily_attendance_records (sync_status);
create trigger set_daily_attendance_updated_at before update on public.daily_attendance_records
  for each row execute function public.set_updated_at();

-- Attendance event log ------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  timestamp timestamptz not null,
  type public.attendance_event_type not null,
  location jsonb,
  photo text,
  synced boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists attendance_user_timestamp_idx on public.attendance (user_id, timestamp desc);
create index if not exists attendance_type_idx on public.attendance (type);
create trigger set_attendance_updated_at before update on public.attendance
  for each row execute function public.set_updated_at();

-- User settings -------------------------------------------------------------
create table if not exists public.user_settings (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade,
  sync_interval integer not null default 5 check (sync_interval > 0),
  max_retries integer not null default 3 check (max_retries >= 0),
  offline_mode boolean not null default false,
  attendance_policy jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create unique index if not exists user_settings_user_id_idx on public.user_settings (user_id) where user_id is not null;
create trigger set_user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Initial seed data ---------------------------------------------------------
insert into public.attendance_policies (id, work_start_time, work_end_time, late_threshold_minutes,
  early_leave_threshold_minutes, overtime_enabled, weekend_work_enabled, grace_period_minutes)
values ('default', '08:00', '17:00', 15, 15, true, false, 0)
on conflict (id) do nothing;

insert into public.user_settings (id, sync_interval, max_retries, offline_mode)
values ('default', 5, 3, false)
on conflict (id) do nothing;

-- Row Level Security --------------------------------------------------------
alter table public.users enable row level security;
alter table public.attendance enable row level security;
alter table public.daily_attendance_records enable row level security;
alter table public.attendance_policies enable row level security;
alter table public.user_settings enable row level security;

-- Helper predicates used in policies
create or replace function public.is_admin_role()
returns boolean
language sql
stable
as $$
  select auth.role() = 'service_role'
         or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin','hr','manager');
$$;

create or replace function public.is_admin_or_self(target_user uuid)
returns boolean
language sql
stable
as $$
  select target_user = auth.uid() or public.is_admin_role();
$$;

-- Users policies ------------------------------------------------------------
drop policy if exists "Users can view themselves" on public.users;
create policy "Users can view themselves" on public.users
  for select using (public.is_admin_or_self(id));
drop policy if exists "Users can update themselves" on public.users;
create policy "Users can update themselves" on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);
drop policy if exists "Admins manage users" on public.users;
create policy "Admins manage users" on public.users
  for all using (public.is_admin_role())
  with check (public.is_admin_role());

-- Attendance event policies -------------------------------------------------
drop policy if exists "Manage own attendance events" on public.attendance;
create policy "Manage own attendance events" on public.attendance
  for all using (user_id = auth.uid() or public.is_admin_role())
  with check (user_id = auth.uid() or public.is_admin_role());

-- Daily attendance policies -------------------------------------------------
drop policy if exists "Manage own daily attendance" on public.daily_attendance_records;
create policy "Manage own daily attendance" on public.daily_attendance_records
  for all using (user_id = auth.uid() or public.is_admin_role())
  with check (user_id = auth.uid() or public.is_admin_role());

-- Attendance policy policies ------------------------------------------------
drop policy if exists "Attendance policy read" on public.attendance_policies;
create policy "Attendance policy read" on public.attendance_policies
  for select using (true);
drop policy if exists "Attendance policy manage" on public.attendance_policies;
create policy "Attendance policy manage" on public.attendance_policies
  for all using (public.is_admin_role())
  with check (public.is_admin_role());

-- User settings policies ----------------------------------------------------
drop policy if exists "Read settings" on public.user_settings;
create policy "Read settings" on public.user_settings
  for select using (
    id = 'default'
    or user_id = auth.uid()
    or public.is_admin_role()
  );
drop policy if exists "Manage own settings" on public.user_settings;
create policy "Manage own settings" on public.user_settings
  for all using (
    (user_id = auth.uid())
    or (id = 'default' and public.is_admin_role())
    or public.is_admin_role()
  )
  with check (
    (user_id = auth.uid())
    or (id = 'default' and public.is_admin_role())
    or public.is_admin_role()
  );

