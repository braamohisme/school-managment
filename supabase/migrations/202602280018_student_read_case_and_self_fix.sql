-- Extra compatibility patch for persistent student "Access denied" cases.
-- Focus: case-insensitive self matching + own-row policy normalization.

-- app_users: ensure own-row read is case-insensitive
drop policy if exists app_users_select_own on public.app_users;
create policy app_users_select_own
on public.app_users
for select
to authenticated
using (
  lower(app_users.email) = lower(auth.jwt() ->> 'email')
);

-- students: normalize to case-insensitive self mapping
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

-- grades: student self-read by linked student email (case-insensitive)
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

-- attendance: student self-read by linked student email (case-insensitive)
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
