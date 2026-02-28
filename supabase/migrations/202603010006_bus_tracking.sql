-- Live bus tracking rows shared by bus drivers to students.

create table if not exists public.bus_tracking (
  driver_email text primary key,
  driver_name text,
  bus_number text,
  route_text text,
  route_url text,
  lat double precision,
  lng double precision,
  speed_kmh numeric not null default 0,
  is_tracking boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.bus_tracking enable row level security;

drop policy if exists bus_tracking_driver_rw on public.bus_tracking;
create policy bus_tracking_driver_rw
on public.bus_tracking
for all
to authenticated
using (
  lower(driver_email)=lower(auth.jwt() ->> 'email')
)
with check (
  lower(driver_email)=lower(auth.jwt() ->> 'email')
);

drop policy if exists bus_tracking_student_read on public.bus_tracking;
create policy bus_tracking_student_read
on public.bus_tracking
for select
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='student'
  )
);

drop policy if exists bus_tracking_admin_read on public.bus_tracking;
create policy bus_tracking_admin_read
on public.bus_tracking
for select
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role in ('admin','principal')
  )
);
