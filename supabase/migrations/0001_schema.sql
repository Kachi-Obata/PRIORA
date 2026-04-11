-- Priora v1 — domain schema
-- 8 tables: 7 domain + 1 infrastructure (push_subscriptions)
-- Run order: schema → rls → triggers → seed

-- =============================================================================
-- profiles
-- =============================================================================
-- Extends auth.users. A row is created via trigger on signup with only `id`.
-- Onboarding fills in full_name and group.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  "group" text check ("group" in ('A', 'B', 'C', 'D')),
  role text not null default 'student' check (role in ('student', 'rep', 'assistant_rep', 'master_admin')),
  created_at timestamptz not null default now()
);

-- =============================================================================
-- courses
-- =============================================================================
-- Seed-only in v1. Code is the PK — no surrogate UUID.

create table if not exists public.courses (
  code text primary key,
  name text not null,
  groups text[] not null,
  -- guard: every entry must be A/B/C/D
  constraint courses_groups_valid check (
    groups <@ array['A','B','C','D']::text[] and array_length(groups, 1) >= 1
  )
);

-- =============================================================================
-- course_group_settings
-- =============================================================================
-- Per-group config. Mainly holds expected_sessions for projection math.

create table if not exists public.course_group_settings (
  course_code text not null references public.courses(code) on delete cascade,
  "group" text not null check ("group" in ('A', 'B', 'C', 'D')),
  expected_sessions integer check (expected_sessions is null or expected_sessions >= 0),
  updated_at timestamptz not null default now(),
  primary key (course_code, "group")
);

-- =============================================================================
-- tasks
-- =============================================================================
-- Core content. Every assignment/test/exam.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  course_code text not null references public.courses(code) on delete restrict,
  title text not null,
  description text,
  type text not null check (type in ('assignment', 'test', 'exam')),
  due_date date not null,
  weight real check (weight is null or (weight >= 0 and weight <= 100)),
  groups text[] not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint tasks_groups_valid check (
    groups <@ array['A','B','C','D']::text[] and array_length(groups, 1) >= 1
  )
);

create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_groups_gin on public.tasks using gin (groups);
create index if not exists tasks_course_code_idx on public.tasks (course_code);

-- =============================================================================
-- task_completions
-- =============================================================================
-- Toggle: row exists = done. Composite PK prevents duplicates.

create table if not exists public.task_completions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

create index if not exists task_completions_user_idx on public.task_completions (user_id);

-- =============================================================================
-- attendance_sessions
-- =============================================================================
-- One row per logged class meeting per group.

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  course_code text not null references public.courses(code) on delete restrict,
  "group" text not null check ("group" in ('A', 'B', 'C', 'D')),
  date date not null default current_date,
  counts boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists attendance_sessions_course_group_idx
  on public.attendance_sessions (course_code, "group");
create index if not exists attendance_sessions_date_idx
  on public.attendance_sessions (date desc);

-- =============================================================================
-- declared_misses
-- =============================================================================
-- Student self-reports. Toggle model, same as task_completions.

create table if not exists public.declared_misses (
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

create index if not exists declared_misses_user_idx on public.declared_misses (user_id);

-- =============================================================================
-- push_subscriptions (infrastructure)
-- =============================================================================
-- Web Push subscription objects per user. A user may have several devices.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
