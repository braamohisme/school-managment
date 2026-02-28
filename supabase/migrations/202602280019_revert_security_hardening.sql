-- Revert security-hardening policies to previous permissive behavior.
-- This restores pre-hardening access model used by the app.

-- app_users: restore authenticated RW
drop policy if exists app_users_admin_rw on public.app_users;
drop policy if exists app_users_select_own on public.app_users;
drop policy if exists app_users_authenticated_rw on public.app_users;
create policy app_users_authenticated_rw
on public.app_users
for all
to authenticated
using (true)
with check (true);

-- accountants: restore global authenticated read
drop policy if exists accountants_role_read on public.accountants;
drop policy if exists accountants_authenticated_read on public.accountants;
create policy accountants_authenticated_read
on public.accountants
for select
to authenticated
using (true);

-- students: restore accountant all-access policy
drop policy if exists students_accountant_read on public.students;
drop policy if exists students_accountant_update on public.students;
drop policy if exists students_accountant_rw on public.students;
create policy students_accountant_rw
on public.students
for all
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'accountant'
  )
)
with check (
  exists (
    select 1 from public.app_users u
    where u.email = auth.jwt() ->> 'email'
      and u.role = 'accountant'
  )
);

-- students/grades/attendance: restore original student-read policies
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
