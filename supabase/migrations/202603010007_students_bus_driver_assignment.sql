-- Assign each student to a bus driver account (optional).

alter table if exists public.students
  add column if not exists bus_driver_email text;

create index if not exists students_bus_driver_email_idx
  on public.students (lower(bus_driver_email));
