insert into public.grade_periods (id, label)
values
  ('p1', 'الربع الأول'),
  ('p2', 'الربع الثاني'),
  ('p3', 'الربع الثالث'),
  ('p4', 'الربع الرابع')
on conflict (id) do update
set label = excluded.label;
