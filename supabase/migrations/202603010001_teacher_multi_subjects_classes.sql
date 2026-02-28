-- Support assigning multiple subjects/classes to teachers.
-- Keep legacy single subject/grade columns for compatibility.

alter table if exists public.app_users
  add column if not exists subjects text[] not null default '{}',
  add column if not exists grades text[] not null default '{}';

alter table if exists public.teachers
  add column if not exists subjects text[] not null default '{}',
  add column if not exists grades text[] not null default '{}';

-- Backfill arrays from legacy scalar fields where arrays are empty.
update public.app_users
set
  subjects = case
    when coalesce(array_length(subjects, 1), 0) = 0 and coalesce(subject, '') <> '' then array[subject]
    else subjects
  end,
  grades = case
    when coalesce(array_length(grades, 1), 0) = 0 and coalesce(grade, '') <> '' then array[grade]
    else grades
  end;

update public.teachers
set
  subjects = case
    when coalesce(array_length(subjects, 1), 0) = 0 and coalesce(subject, '') <> '' then array[subject]
    else subjects
  end,
  grades = case
    when coalesce(array_length(grades, 1), 0) = 0 and coalesce(grade, '') <> '' then array[grade]
    else grades
  end;
