-- Extend auth_attempts to also track password reset requests, reusing the
-- same rate-limiting infrastructure built for login/signup.

alter table public.auth_attempts drop constraint auth_attempts_action_check;
alter table public.auth_attempts
  add constraint auth_attempts_action_check
  check (action in ('login', 'signup', 'password_reset'));
