-- Default subjects seed.

insert into public.subjects (id, label_ar, label_en)
values
  ('math', 'رياضيات', 'Math'),
  ('science', 'علوم', 'Science'),
  ('english', 'إنجليزي', 'English'),
  ('history', 'تاريخ', 'History'),
  ('art', 'فنون', 'Art')
on conflict (id) do update
set
  label_ar = excluded.label_ar,
  label_en = excluded.label_en;
