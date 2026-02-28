-- Compatibility rollback for student read access.
-- This relaxes the strict student-read policies introduced in 202602280015.
-- Goal: restore working student grades/attendance without undoing all hardening.

-- 1) students: allow own-row read by email match (case-insensitive),
--    OR via approved-login mapping where role is student.
drop policy if exists students_student_read_own on public.students;
create policy students_student_read_own
on public.students
for select
to authenticated
using (
  lower(students.email) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1
    from public.app_users u
    where lower(u.email) = lower(auth.jwt() ->> 'email')
      and u.role = 'student'
      and lower(students.email) = lower(u.email)
  )
);

-- 2) grades: allow student read when linked student row email matches auth email
--    (case-insensitive), with same app_users fallback.
drop policy if exists grades_student_read_own on public.grades;
create policy grades_student_read_own
on public.grades
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = grades.student_id
      and (
        lower(s.email) = lower(auth.jwt() ->> 'email')
        or exists (
          select 1
          from public.app_users u
          where lower(u.email) = lower(auth.jwt() ->> 'email')
            and u.role = 'student'
            and lower(s.email) = lower(u.email)
        )
      )
  )
);

-- 3) attendance: same compatibility rule as grades.
drop policy if exists attendance_student_read_own on public.attendance;
create policy attendance_student_read_own
on public.attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = attendance.student_id
      and (
        lower(s.email) = lower(auth.jwt() ->> 'email')
        or exists (
          select 1
          from public.app_users u
          where lower(u.email) = lower(auth.jwt() ->> 'email')
            and u.role = 'student'
            and lower(s.email) = lower(u.email)
        )
      )
  )
);
