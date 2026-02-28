-- Security hardening patch (least-privilege RLS + accountant scope tightening).
-- Keep behavior compatible with current app flows.

-- 1) app_users: remove overly-broad authenticated RW policy.
drop policy if exists app_users_authenticated_rw on public.app_users;
drop policy if exists app_users_select_own on public.app_users;
drop policy if exists app_users_admin_rw on public.app_users;

-- Any authenticated user can read only their own approved-login row.
create policy app_users_select_own
on public.app_users
for select
to authenticated
using (email = auth.jwt() ->> 'email');

-- Only admins can read/write all approved-login rows.
create policy app_users_admin_rw
on public.app_users
for all
to authenticated
using (
  exists (
    select 1
    from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'admin'
  )
);

-- 2) accountants: remove global authenticated read.
drop policy if exists accountants_authenticated_read on public.accountants;
drop policy if exists accountants_role_read on public.accountants;

create policy accountants_role_read
on public.accountants
for select
to authenticated
using (
  exists (
    select 1
    from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role in ('admin', 'accountant')
  )
);

-- 3) students: accountant access narrowed to read/update only (no insert/delete).
drop policy if exists students_accountant_rw on public.students;
drop policy if exists students_accountant_read on public.students;
drop policy if exists students_accountant_update on public.students;

create policy students_accountant_read
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'accountant'
  )
);

create policy students_accountant_update
on public.students
for update
to authenticated
using (
  exists (
    select 1
    from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'accountant'
  )
)
with check (
  exists (
    select 1
    from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'accountant'
  )
);
