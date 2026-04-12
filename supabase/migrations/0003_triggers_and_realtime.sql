-- Priora v1 — auth trigger + realtime publication

-- =============================================================================
-- New user → profiles skeleton row
-- =============================================================================
-- On auth.users INSERT, create a matching profiles row with just the id.
-- Onboarding UI fills full_name and "group" afterward.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================================
-- Keep course_group_settings.updated_at fresh
-- =============================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cgs_touch_updated_at on public.course_group_settings;
create trigger cgs_touch_updated_at
  before update on public.course_group_settings
  for each row execute procedure public.touch_updated_at();

-- =============================================================================
-- Realtime publication
-- =============================================================================
-- Enable realtime on tasks and attendance_sessions only.
-- Personal tables (task_completions, declared_misses) stay client-local.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.attendance_sessions;
alter publication supabase_realtime add table public.course_group_settings;
