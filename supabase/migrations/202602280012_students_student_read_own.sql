-- Allow a student to read only their own row in public.students.
-- Required for student dashboard to resolve student_id by auth email.

drop policy if exists students_student_read_own on public.students;

create policy students_student_read_own
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'student'
      and students.email = u.email
  )
);
