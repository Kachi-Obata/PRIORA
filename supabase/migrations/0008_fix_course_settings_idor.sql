-- Tighten course_group_settings write policies.
--
-- Gap: non-master admins could upsert settings for any course_code (as long
-- as the group matched their own), even if their group is not enrolled in that
-- course. The FK prevents fake course codes, but not cross-course writes.
--
-- Fix: add an existence sub-select that verifies the target course actually
-- includes the calling user's group in its `groups[]` array.

drop policy if exists cgs_insert on public.course_group_settings;
create policy cgs_insert on public.course_group_settings
  for insert to authenticated
  with check (
    public.is_master_admin()
    or (
      public.is_admin()
      and "group" = public.current_user_group()
      -- course must include the admin's group
      and exists (
        select 1 from public.courses c
        where c.code = course_code
          and public.current_user_group() = any (c.groups)
      )
    )
  );

drop policy if exists cgs_update on public.course_group_settings;
create policy cgs_update on public.course_group_settings
  for update to authenticated
  using (
    public.is_master_admin()
    or (
      public.is_admin()
      and "group" = public.current_user_group()
      and exists (
        select 1 from public.courses c
        where c.code = course_code
          and public.current_user_group() = any (c.groups)
      )
    )
  )
  with check (
    public.is_master_admin()
    or (
      public.is_admin()
      and "group" = public.current_user_group()
      and exists (
        select 1 from public.courses c
        where c.code = course_code
          and public.current_user_group() = any (c.groups)
      )
    )
  );
