-- Add principals table and policies for admin-managed principal profiles.

create table if not exists public.principals (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table public.principals enable row level security;

drop policy if exists principals_admin_rw on public.principals;
create policy principals_admin_rw
on public.principals
for all
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='admin'
  )
)
with check (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='admin'
  )
);

drop policy if exists principals_self_read on public.principals;
create policy principals_self_read
on public.principals
for select
to authenticated
using (
  lower(principals.email)=lower(auth.jwt() ->> 'email')
);

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
