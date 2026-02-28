-- Add principal role and allow principal grade-management access.

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'app_users'
      and c.conname = 'app_users_role_check'
  ) then
    execute 'alter table public.app_users drop constraint app_users_role_check';
  end if;
end $$;

alter table public.app_users
  add constraint app_users_role_check
  check (role in ('admin','principal','teacher','student','bus_driver','accountant'));

drop policy if exists students_principal_read on public.students;
create policy students_principal_read
on public.students
for select
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='principal'
  )
);

drop policy if exists grades_principal_rw on public.grades;
create policy grades_principal_rw
on public.grades
for all
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='principal'
  )
)
with check (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='principal'
  )
);
