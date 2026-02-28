-- Add per-grade weekly schedules and teacher wage tracking.

alter table if exists public.teachers
  add column if not exists wage numeric not null default 0,
  add column if not exists wage_paid boolean not null default false;

create table if not exists public.grade_schedules (
  grade text primary key,
  schedule_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.grade_schedules enable row level security;

drop policy if exists grade_schedules_principal_rw on public.grade_schedules;
create policy grade_schedules_principal_rw
on public.grade_schedules
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

drop policy if exists grade_schedules_teacher_read on public.grade_schedules;
create policy grade_schedules_teacher_read
on public.grade_schedules
for select
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='teacher'
  )
);

drop policy if exists grade_schedules_student_read on public.grade_schedules;
create policy grade_schedules_student_read
on public.grade_schedules
for select
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='student'
  )
);

drop policy if exists teachers_accountant_read on public.teachers;
create policy teachers_accountant_read
on public.teachers
for select
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='accountant'
  )
);

drop policy if exists teachers_accountant_update on public.teachers;
create policy teachers_accountant_update
on public.teachers
for update
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='accountant'
  )
)
with check (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(auth.jwt() ->> 'email')
      and u.role='accountant'
  )
);
