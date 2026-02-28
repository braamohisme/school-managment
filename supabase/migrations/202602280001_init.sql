-- Core tables used by v1git+++.jsx

create table if not exists public.app_users (
  email text primary key,
  name text not null,
  role text not null check (role in ('admin','teacher','student','bus_driver')),
  phone text,
  grade text,
  subject text,
  bus_number text,
  route text,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id text primary key,
  name text not null,
  email text not null unique,
  grade text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id text primary key,
  name text not null,
  email text not null unique,
  subject text not null,
  subject_display text,
  grade text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  student_id text not null references public.students(id) on delete cascade,
  year_month text not null,
  days jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (student_id, year_month)
);

create table if not exists public.grades (
  student_id text not null references public.students(id) on delete cascade,
  period_id text not null,
  scores jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (student_id, period_id)
);

alter table public.app_users enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.attendance enable row level security;
alter table public.grades enable row level security;

drop policy if exists app_users_select_own on public.app_users;
create policy app_users_select_own
on public.app_users
for select
to authenticated
using (email = auth.jwt() ->> 'email');

drop policy if exists students_admin_teacher_rw on public.students;
create policy students_admin_teacher_rw
on public.students
for all
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role in ('admin','teacher')
  )
)
with check (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role in ('admin','teacher')
  )
);

drop policy if exists teachers_admin_rw on public.teachers;
create policy teachers_admin_rw
on public.teachers
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

drop policy if exists attendance_admin_teacher_rw on public.attendance;
create policy attendance_admin_teacher_rw
on public.attendance
for all
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role in ('admin','teacher')
  )
)
with check (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role in ('admin','teacher')
  )
);

drop policy if exists attendance_student_read_own on public.attendance;
create policy attendance_student_read_own
on public.attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.app_users u
    join public.students s on s.email = u.email
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'student'
      and s.id = attendance.student_id
  )
);

drop policy if exists grades_admin_teacher_rw on public.grades;
create policy grades_admin_teacher_rw
on public.grades
for all
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role in ('admin','teacher')
  )
)
with check (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role in ('admin','teacher')
  )
);

drop policy if exists grades_student_read_own on public.grades;
create policy grades_student_read_own
on public.grades
for select
to authenticated
using (
  exists (
    select 1
    from public.app_users u
    join public.students s on s.email = u.email
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'student'
      and s.id = grades.student_id
  )
);
