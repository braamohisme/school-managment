-- Add optional profile photo URL/data fields for user-facing pages.

alter table if exists public.app_users
  add column if not exists photo_url text;

alter table if exists public.students
  add column if not exists photo_url text;

alter table if exists public.teachers
  add column if not exists photo_url text;

alter table if exists public.accountants
  add column if not exists photo_url text;
