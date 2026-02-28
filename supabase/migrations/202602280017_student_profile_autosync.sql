-- Auto-sync student approved-logins (app_users.role='student') into public.students.
-- Fixes cases where student can authenticate but has no students row.

-- Helper: deterministic id from email for missing student rows.
create or replace function public._student_id_from_email(p_email text)
returns text
language sql
immutable
as $$
  select 'stu_' || substr(md5(lower(coalesce(p_email, ''))), 1, 12)
$$;

-- Trigger function: keep students row in sync for student role.
create or replace function public.sync_student_from_app_users()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'student' then
    insert into public.students (id, name, email, grade, phone)
    values (
      public._student_id_from_email(new.email),
      coalesce(new.name, new.email),
      new.email,
      coalesce(new.grade, 'Grade 1'),
      new.phone
    )
    on conflict (email) do update
    set
      name = excluded.name,
      grade = coalesce(excluded.grade, public.students.grade),
      phone = excluded.phone;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_student_from_app_users on public.app_users;
create trigger trg_sync_student_from_app_users
after insert or update of email, name, role, grade, phone
on public.app_users
for each row
execute function public.sync_student_from_app_users();

-- Backfill existing student logins.
insert into public.students (id, name, email, grade, phone)
select
  public._student_id_from_email(u.email),
  coalesce(u.name, u.email),
  u.email,
  coalesce(u.grade, 'Grade 1'),
  u.phone
from public.app_users u
where u.role = 'student'
on conflict (email) do update
set
  name = excluded.name,
  grade = coalesce(excluded.grade, public.students.grade),
  phone = excluded.phone;
