create table if not exists public.grade_periods (
  id text primary key,
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.grade_periods enable row level security;

drop policy if exists grade_periods_read_all_authenticated on public.grade_periods;
create policy grade_periods_read_all_authenticated
on public.grade_periods
for select
to authenticated
using (true);

drop policy if exists grade_periods_admin_write on public.grade_periods;
create policy grade_periods_admin_write
on public.grade_periods
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
