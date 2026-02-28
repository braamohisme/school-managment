-- Compatibility fix for older grades table schemas.
-- Safe to run multiple times.

alter table if exists public.grades
add column if not exists scores jsonb not null default '{}'::jsonb;
