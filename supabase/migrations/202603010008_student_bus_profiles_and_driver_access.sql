-- Student house location + bus-driver assignment access.

create table if not exists public.student_bus_profiles (
  student_id text primary key references public.students(id) on delete cascade,
  house_address text,
  house_lat double precision,
  house_lng double precision,
  updated_at timestamptz not null default now()
);

alter table public.student_bus_profiles enable row level security;

drop policy if exists student_bus_profiles_student_rw on public.student_bus_profiles;
create policy student_bus_profiles_student_rw
on public.student_bus_profiles
for all
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_bus_profiles.student_id
      and lower(s.email)=lower(auth.jwt() ->> 'email')
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = student_bus_profiles.student_id
      and lower(s.email)=lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists student_bus_profiles_driver_read on public.student_bus_profiles;
create policy student_bus_profiles_driver_read
on public.student_bus_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_bus_profiles.student_id
      and lower(s.bus_driver_email)=lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists student_bus_profiles_admin_read on public.student_bus_profiles;
create policy student_bus_profiles_admin_read
on public.student_bus_profiles
for select
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role in ('admin','principal')
  )
);

drop policy if exists students_bus_driver_read_all on public.students;
create policy students_bus_driver_read_all
on public.students
for select
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='bus_driver'
  )
);

drop policy if exists students_bus_driver_assign_self on public.students;
create policy students_bus_driver_assign_self
on public.students
for update
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='bus_driver'
      and (students.bus_driver_email is null or lower(students.bus_driver_email)=lower(u.email))
  )
)
with check (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='bus_driver'
      and lower(students.bus_driver_email)=lower(u.email)
  )
);
