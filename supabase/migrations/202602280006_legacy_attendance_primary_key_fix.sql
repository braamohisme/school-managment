-- Fix legacy attendance primary key shape.
-- Old schema often had PK(student_id), but the app needs (student_id, year_month).

do $$
declare
  key_cols text;
begin
  select string_agg(a.attname, ',' order by k.ord)
    into key_cols
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  join lateral unnest(c.conkey) with ordinality as k(attnum, ord) on true
  join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
  where n.nspname = 'public'
    and t.relname = 'attendance'
    and c.contype = 'p';

  if key_cols = 'student_id' then
    execute 'alter table public.attendance drop constraint if exists attendance_pkey';
  end if;
end $$;

create unique index if not exists attendance_student_year_month_uidx
on public.attendance (student_id, year_month);
