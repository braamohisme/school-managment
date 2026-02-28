-- Compatibility fix for older attendance table schemas.
-- Safe to run multiple times.

alter table if exists public.attendance
add column if not exists year_month text;

alter table if exists public.attendance
add column if not exists days jsonb not null default '{}'::jsonb;

create unique index if not exists attendance_student_year_month_uidx
on public.attendance (student_id, year_month);
