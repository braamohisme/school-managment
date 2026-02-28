-- Fix student self-access for students/grades/attendance.
-- This removes hard dependency on app_users.role for student reads.

-- 1) students: student can read only their own row by auth email.
drop policy if exists students_student_read_own on public.students;
create policy students_student_read_own
on public.students
for select
to authenticated
using (
  students.email = auth.jwt() ->> 'email'
);

-- 2) grades: student can read rows linked to their own student id.
drop policy if exists grades_student_read_own on public.grades;
create policy grades_student_read_own
on public.grades
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.email = auth.jwt() ->> 'email'
      and s.id = grades.student_id
  )
);

-- 3) attendance: student can read rows linked to their own student id.
drop policy if exists attendance_student_read_own on public.attendance;
create policy attendance_student_read_own
on public.attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.email = auth.jwt() ->> 'email'
      and s.id = attendance.student_id
  )
);
