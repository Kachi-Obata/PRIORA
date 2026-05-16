-- Security hardening: close two RLS gaps found in the threat analysis.
--
-- Gap 1: Students can call Supabase directly and set their own `group` column
--   to any value (A/B/C/D), letting them switch groups to see other groups'
--   tasks and attendance sessions. Fix: Postgres trigger rejects the change
--   unless the caller is a master_admin or service role.
--
-- Gap 2: The declared_misses INSERT policy only checks `user_id = auth.uid()`.
--   A student could declare a miss on a session belonging to another group.
--   Fix: tighten the policy to also verify the session is in the user's group.

-- =============================================================================
-- Gap 1: prevent self-group-switch
-- =============================================================================

create or replace function public._prevent_group_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No change — nothing to do.
  if NEW."group" IS NOT DISTINCT FROM OLD."group" then
    return NEW;
  end if;

  -- Service role (auth.uid() is NULL) and master_admin may change groups.
  if auth.uid() is null or public.is_master_admin() then
    return NEW;
  end if;

  raise exception 'You cannot change your own group. Ask a master admin.';
end;
$$;

create trigger profiles_prevent_group_change
  before update on public.profiles
  for each row
  execute function public._prevent_group_change();

-- =============================================================================
-- Gap 2: declared_misses must belong to the user's own group
-- =============================================================================

drop policy if exists dm_insert on public.declared_misses;

create policy dm_insert on public.declared_misses
  for insert to authenticated
  with check (
    user_id = auth.uid()
    -- The session being marked must belong to the user's own group.
    and exists (
      select 1
      from public.attendance_sessions s
      where s.id = session_id
        and s."group" = public.current_user_group()
    )
  );
