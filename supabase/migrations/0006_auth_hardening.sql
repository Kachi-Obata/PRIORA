-- Auth hardening: rate limiting / lockout storage + profile field constraints.
--
-- auth_attempts: records every login and signup attempt (success or failure)
-- so the API routes in app/api/auth/* can enforce sliding-window lockouts.
-- RLS is enabled with NO policies — default-deny for anon/authenticated.
-- Only the service role (which bypasses RLS) can read or write this table.

create table if not exists public.auth_attempts (
  id          bigserial   primary key,
  ts          timestamptz not null default now(),
  action      text        not null check (action in ('login', 'signup')),
  identifier  text        not null, -- normalized (lowercased, trimmed) email
  ip          text,
  success     boolean     not null
);

create index if not exists auth_attempts_identifier_idx
  on public.auth_attempts (action, identifier, ts desc);
create index if not exists auth_attempts_ip_idx
  on public.auth_attempts (action, ip, ts desc);

alter table public.auth_attempts enable row level security;
-- Intentionally no policies — service role only.

-- =============================================================================
-- Profile field validation at the DB layer (the ultimate "server").
-- =============================================================================

alter table public.profiles
  add constraint profiles_full_name_length
  check (full_name is null or (length(trim(full_name)) > 0 and length(full_name) <= 100));
