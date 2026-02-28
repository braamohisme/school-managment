-- Normalize legacy schemas to the structure expected by the app + seed file.
-- Safe to run multiple times.

-- Ensure core tables exist (minimal shape first).
create table if not exists public.app_users (
  email text
);

create table if not exists public.students (
  id text
);

create table if not exists public.teachers (
  id text
);

create table if not exists public.grades (
  student_id text,
  period_id text
);

create table if not exists public.attendance (
  student_id text
);

-- Add missing columns used by app/seed.
alter table public.app_users add column if not exists name text;
alter table public.app_users add column if not exists role text;
alter table public.app_users add column if not exists phone text;
alter table public.app_users add column if not exists grade text;
alter table public.app_users add column if not exists subject text;
alter table public.app_users add column if not exists bus_number text;
alter table public.app_users add column if not exists route text;
alter table public.app_users add column if not exists created_at timestamptz default now();

alter table public.students add column if not exists name text;
alter table public.students add column if not exists email text;
alter table public.students add column if not exists grade text;
alter table public.students add column if not exists phone text;
alter table public.students add column if not exists created_at timestamptz default now();

alter table public.teachers add column if not exists name text;
alter table public.teachers add column if not exists email text;
alter table public.teachers add column if not exists subject text;
alter table public.teachers add column if not exists subject_display text;
alter table public.teachers add column if not exists grade text;
alter table public.teachers add column if not exists phone text;
alter table public.teachers add column if not exists created_at timestamptz default now();

alter table public.grades add column if not exists scores jsonb not null default '{}'::jsonb;
alter table public.grades add column if not exists created_at timestamptz default now();

alter table public.attendance add column if not exists year_month text;
alter table public.attendance add column if not exists days jsonb not null default '{}'::jsonb;
alter table public.attendance add column if not exists created_at timestamptz default now();

-- Add indexes/constraints needed by ON CONFLICT targets in seed.
create unique index if not exists app_users_email_uidx on public.app_users (email);
create unique index if not exists students_id_uidx on public.students (id);
create unique index if not exists teachers_id_uidx on public.teachers (id);
create unique index if not exists grades_student_period_uidx on public.grades (student_id, period_id);
create unique index if not exists attendance_student_year_month_uidx on public.attendance (student_id, year_month);

-- Helpful uniqueness for lookups.
create unique index if not exists students_email_uidx on public.students (email);
create unique index if not exists teachers_email_uidx on public.teachers (email);
