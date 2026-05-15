-- Audit log: structured record of every significant action on the platform.
--
-- Searchable via:
--   • Supabase dashboard → Table Editor → audit_log
--   • SQL: select * from audit_log where action = 'task.create' order by ts desc;
--   • Supabase MCP from Claude Code
--
-- Write path:
--   • Admin API routes (task.create, session.create) → lib/audit.ts → service role INSERT
--   • Client-side deletes (ActivityLog) → Postgres AFTER DELETE triggers below
--   • Auth events → auth.users trigger (signup)
--
-- Read path:
--   • master_admin only via RLS; everything else uses service role server-side.

-- =============================================================================
-- Table
-- =============================================================================

create table if not exists public.audit_log (
  id          bigserial    primary key,
  ts          timestamptz  not null default now(),
  actor_id    uuid         references auth.users(id) on delete set null,
  action      text         not null, -- 'task.create' | 'task.delete' | 'session.create' | 'session.delete' | 'auth.signup'
  resource_id text,                  -- PK of the affected row (cast to text for flexibility)
  meta        jsonb,                 -- course_code, group, title, groups, etc.
  ok          boolean      not null default true,
  error_msg   text,                  -- populated when ok = false
  ip          text                   -- x-forwarded-for, best-effort
);

create index if not exists audit_log_ts_idx     on public.audit_log (ts desc);
create index if not exists audit_log_actor_idx  on public.audit_log (actor_id);
create index if not exists audit_log_action_idx on public.audit_log (action);

-- =============================================================================
-- RLS — master_admin read-only; all writes go through service role
-- =============================================================================

alter table public.audit_log enable row level security;

create policy "master_admin can read audit log"
  on public.audit_log for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'master_admin'
    )
  );

-- =============================================================================
-- Trigger: capture client-side task deletes
-- (ActivityLog calls supabase browser client directly, so we use a DB trigger)
-- =============================================================================

create or replace function public._audit_task_delete()
returns trigger language plpgsql security definer as $$
begin
  insert into public.audit_log (actor_id, action, resource_id, meta)
  values (
    auth.uid(),
    'task.delete',
    OLD.id::text,
    jsonb_build_object(
      'course_code', OLD.course_code,
      'title',       OLD.title,
      'type',        OLD.type,
      'due_date',    OLD.due_date::text,
      'groups',      OLD.groups
    )
  );
  return OLD;
end;
$$;

create trigger tasks_audit_delete
  after delete on public.tasks
  for each row execute function public._audit_task_delete();

-- =============================================================================
-- Trigger: capture client-side session deletes
-- =============================================================================

create or replace function public._audit_session_delete()
returns trigger language plpgsql security definer as $$
begin
  insert into public.audit_log (actor_id, action, resource_id, meta)
  values (
    auth.uid(),
    'session.delete',
    OLD.id::text,
    jsonb_build_object(
      'course_code', OLD.course_code,
      'group',       OLD."group",
      'date',        OLD.date::text,
      'counts',      OLD.counts
    )
  );
  return OLD;
end;
$$;

create trigger sessions_audit_delete
  after delete on public.attendance_sessions
  for each row execute function public._audit_session_delete();

-- =============================================================================
-- Trigger: capture new user signups
-- =============================================================================

create or replace function public._audit_auth_signup()
returns trigger language plpgsql security definer as $$
begin
  insert into public.audit_log (actor_id, action, resource_id, meta)
  values (
    NEW.id,
    'auth.signup',
    NEW.id::text,
    jsonb_build_object('email', NEW.email)
  );
  return NEW;
end;
$$;

create trigger auth_users_audit_signup
  after insert on auth.users
  for each row execute function public._audit_auth_signup();
