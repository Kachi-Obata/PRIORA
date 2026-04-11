-- Priora v1 — Row Level Security policies
-- Enable RLS on every table. Default-deny + explicit policies.

-- =============================================================================
-- Helper functions for policies
-- =============================================================================

-- Current user's group (null if not yet onboarded)
create or replace function public.current_user_group()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select "group" from public.profiles where id = auth.uid();
$$;

-- Current user's role
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Is the current user an admin of any kind?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('rep', 'assistant_rep', 'master_admin');
$$;

create or replace function public.is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'master_admin';
$$;

grant execute on function public.current_user_group() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_master_admin() to authenticated;

-- =============================================================================
-- Enable RLS
-- =============================================================================

alter table public.profiles               enable row level security;
alter table public.courses                enable row level security;
alter table public.course_group_settings  enable row level security;
alter table public.tasks                  enable row level security;
alter table public.task_completions       enable row level security;
alter table public.attendance_sessions    enable row level security;
alter table public.declared_misses        enable row level security;
alter table public.push_subscriptions     enable row level security;

-- =============================================================================
-- profiles
-- =============================================================================
-- Users read their own profile. Admins can also read profiles within their
-- group (to resolve attribution). Master admin sees all.

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (
    auth.uid() = id
    or public.is_master_admin()
    or (public.is_admin() and "group" = public.current_user_group())
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- prevent self-promotion: role column must not change unless master_admin
    and (role = (select role from public.profiles where id = auth.uid()) or public.is_master_admin())
  );

-- =============================================================================
-- courses
-- =============================================================================
-- A course is visible to any user whose group is in its groups[] array.

drop policy if exists courses_select_visible on public.courses;
create policy courses_select_visible on public.courses
  for select to authenticated
  using (
    public.is_master_admin()
    or public.current_user_group() = any (groups)
  );

-- =============================================================================
-- course_group_settings
-- =============================================================================
-- Students see settings for their own group. Admins can update settings
-- for their own group. Master admin: full access.

drop policy if exists cgs_select on public.course_group_settings;
create policy cgs_select on public.course_group_settings
  for select to authenticated
  using (
    public.is_master_admin()
    or "group" = public.current_user_group()
  );

drop policy if exists cgs_insert on public.course_group_settings;
create policy cgs_insert on public.course_group_settings
  for insert to authenticated
  with check (
    public.is_master_admin()
    or (public.is_admin() and "group" = public.current_user_group())
  );

drop policy if exists cgs_update on public.course_group_settings;
create policy cgs_update on public.course_group_settings
  for update to authenticated
  using (
    public.is_master_admin()
    or (public.is_admin() and "group" = public.current_user_group())
  )
  with check (
    public.is_master_admin()
    or (public.is_admin() and "group" = public.current_user_group())
  );

-- =============================================================================
-- tasks
-- =============================================================================

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    public.is_master_admin()
    or public.current_user_group() = any (groups)
  );

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    public.is_admin()
    and created_by = auth.uid()
    -- non-master admins can only post to their own group
    and (public.is_master_admin() or public.current_user_group() = any (groups))
  );

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_master_admin() or created_by = auth.uid())
  with check (public.is_master_admin() or created_by = auth.uid());

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_master_admin() or created_by = auth.uid());

-- =============================================================================
-- task_completions
-- =============================================================================
-- Fully private: each user manages their own completions.

drop policy if exists tc_select on public.task_completions;
create policy tc_select on public.task_completions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists tc_insert on public.task_completions;
create policy tc_insert on public.task_completions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists tc_delete on public.task_completions;
create policy tc_delete on public.task_completions
  for delete to authenticated
  using (user_id = auth.uid());

-- =============================================================================
-- attendance_sessions
-- =============================================================================

drop policy if exists as_select on public.attendance_sessions;
create policy as_select on public.attendance_sessions
  for select to authenticated
  using (
    public.is_master_admin()
    or "group" = public.current_user_group()
  );

drop policy if exists as_insert on public.attendance_sessions;
create policy as_insert on public.attendance_sessions
  for insert to authenticated
  with check (
    public.is_admin()
    and created_by = auth.uid()
    and (public.is_master_admin() or "group" = public.current_user_group())
  );

drop policy if exists as_update on public.attendance_sessions;
create policy as_update on public.attendance_sessions
  for update to authenticated
  using (public.is_master_admin() or created_by = auth.uid())
  with check (public.is_master_admin() or created_by = auth.uid());

drop policy if exists as_delete on public.attendance_sessions;
create policy as_delete on public.attendance_sessions
  for delete to authenticated
  using (public.is_master_admin() or created_by = auth.uid());

-- =============================================================================
-- declared_misses
-- =============================================================================
-- Private per student.

drop policy if exists dm_select on public.declared_misses;
create policy dm_select on public.declared_misses
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists dm_insert on public.declared_misses;
create policy dm_insert on public.declared_misses
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists dm_delete on public.declared_misses;
create policy dm_delete on public.declared_misses
  for delete to authenticated
  using (user_id = auth.uid());

-- =============================================================================
-- push_subscriptions
-- =============================================================================
-- Users read/manage their own subscriptions. Service role writes via API.

drop policy if exists ps_select on public.push_subscriptions;
create policy ps_select on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists ps_insert on public.push_subscriptions;
create policy ps_insert on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists ps_delete on public.push_subscriptions;
create policy ps_delete on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());
