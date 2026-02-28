-- Persist separate subjects/periods for grades 1-4 vs 5-6.

alter table if exists public.subjects
  add column if not exists grade_band text not null default 'upper';

alter table if exists public.grade_periods
  add column if not exists grade_band text not null default 'upper';

-- Normalize any existing values to supported options.
update public.subjects
set grade_band = case when lower(coalesce(grade_band,''))='primary' then 'primary' else 'upper' end;

update public.grade_periods
set grade_band = case when lower(coalesce(grade_band,''))='primary' then 'primary' else 'upper' end;

-- Ensure only valid band values are stored.
do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'subjects'
      and c.conname = 'subjects_grade_band_check'
  ) then
    execute 'alter table public.subjects drop constraint subjects_grade_band_check';
  end if;
end $$;

alter table public.subjects
  add constraint subjects_grade_band_check
  check (grade_band in ('upper','primary'));

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'grade_periods'
      and c.conname = 'grade_periods_grade_band_check'
  ) then
    execute 'alter table public.grade_periods drop constraint grade_periods_grade_band_check';
  end if;
end $$;

alter table public.grade_periods
  add constraint grade_periods_grade_band_check
  check (grade_band in ('upper','primary'));
