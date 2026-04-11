# Supabase setup

Run these in order via the Supabase SQL editor (or `supabase db push` if you use the CLI):

1. `migrations/0001_schema.sql` — tables + indexes
2. `migrations/0002_rls.sql` — policies + helper functions
3. `migrations/0003_triggers_and_realtime.sql` — auth trigger, realtime publication
4. `seed.sql` — course list (edit before running with the real courses)

## Promoting reps / admins

Priora has no UI for role management. To promote a user, run in the SQL editor:

```sql
update public.profiles set role = 'rep' where id = '<user-uuid>';
-- or: 'assistant_rep', 'master_admin'
```

You can find the user's UUID in the Auth → Users dashboard.

## Setting expected sessions for a course/group

Reps can do this in the app's Admin screen. To pre-seed from SQL:

```sql
insert into public.course_group_settings (course_code, "group", expected_sessions)
values ('CSC 211', 'A', 14)
on conflict (course_code, "group") do update set expected_sessions = excluded.expected_sessions;
```
