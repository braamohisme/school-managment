-- Subjects table for persistent curriculum list.

create table if not exists public.subjects (
  id text primary key,
  label_ar text not null,
  label_en text not null,
  created_at timestamptz not null default now()
);

alter table public.subjects enable row level security;

drop policy if exists subjects_read_all_authenticated on public.subjects;
create policy subjects_read_all_authenticated
on public.subjects
for select
to authenticated
using (true);

drop policy if exists subjects_admin_write on public.subjects;
create policy subjects_admin_write
on public.subjects
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
