-- Add student financial fields + accountant role/table.

alter table if exists public.students
  add column if not exists tuition_total numeric not null default 0,
  add column if not exists tuition_paid numeric not null default 0;

create table if not exists public.accountants (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.accountants enable row level security;

drop policy if exists accountants_admin_rw on public.accountants;
create policy accountants_admin_rw
on public.accountants
for all
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'admin'
  )
);

drop policy if exists accountants_authenticated_read on public.accountants;
create policy accountants_authenticated_read
on public.accountants
for select
to authenticated
using (true);

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
  check (role in ('admin','teacher','student','bus_driver','accountant'));

drop policy if exists students_accountant_rw on public.students;
create policy students_accountant_rw
on public.students
for all
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'accountant'
  )
)
with check (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'accountant'
  )
);
