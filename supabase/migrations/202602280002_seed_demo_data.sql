-- Demo seed data for roles/profiles used by v1git+++.jsx
-- Run after 202602280001_init.sql

insert into public.app_users (email, name, role, phone, grade, subject, bus_number, route)
values
  ('admin@school.edu',   'مدير النظام',    'admin',      '+966 50 000 0001', null,      null,      null,       null),
  ('teacher@school.edu', 'د. سارة جونسون', 'teacher',    '+966 50 123 4567', null,      'math',    null,       null),
  ('student@school.edu', 'أليكس مارتينيز', 'student',    '+966 50 987 6543', 'الصف 10', null,      null,       null),
  ('driver@school.edu',  'جون السائق',     'bus_driver', '+966 50 456 7890', null,      null,      'حافلة 45', 'مسار أ - الحي الشرقي')
on conflict (email) do update
set
  name = excluded.name,
  role = excluded.role,
  phone = excluded.phone,
  grade = excluded.grade,
  subject = excluded.subject,
  bus_number = excluded.bus_number,
  route = excluded.route;

insert into public.students (id, name, email, grade, phone)
values
  ('s1', 'أليكس مارتينيز', 'student@school.edu', 'الصف 10', '+966 50 987 6543'),
  ('s2', 'جيمي لي',        'jamie@school.edu',   'الصف 10', '+966 50 234 5678'),
  ('s3', 'سام ريفيرا',     'sam@school.edu',     'الصف 11', '+966 50 345 6789'),
  ('s4', 'بريا باتيل',     'priya@school.edu',   'الصف 11', '+966 50 456 7890'),
  ('s5', 'كريس نجوين',     'chris@school.edu',   'الصف 12', '+966 50 567 8901')
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  grade = excluded.grade,
  phone = excluded.phone;

insert into public.teachers (id, name, email, subject, subject_display, grade, phone)
values
  ('t1', 'د. سارة جونسون', 'teacher@school.edu', 'math',    'رياضيات', 'الصف 10', '+966 50 123 4567'),
  ('t2', 'م. داود بارك',   'david@school.edu',   'science', 'علوم',    'الصف 11', '+966 50 678 9012')
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  subject = excluded.subject,
  subject_display = excluded.subject_display,
  grade = excluded.grade,
  phone = excluded.phone;

insert into public.grades (student_id, period_id, scores)
values
  ('s1', 'p1', '{"math":85,"science":88,"english":90,"history":87,"art":92}'::jsonb),
  ('s1', 'p2', '{"math":88,"science":90,"english":87,"history":89,"art":94}'::jsonb),
  ('s1', 'p3', '{"math":90,"science":92,"english":89,"history":91,"art":95}'::jsonb),
  ('s1', 'p4', '{"math":91,"science":93,"english":91,"history":90,"art":96}'::jsonb)
on conflict (student_id, period_id) do update
set scores = excluded.scores;

insert into public.attendance (student_id, year_month, days)
values
  ('s1', '2026-0', '{"1":true,"2":true,"3":false,"4":true}'::jsonb),
  ('s1', '2026-1', '{"2":true,"3":true,"4":true,"5":false}'::jsonb)
on conflict (student_id, year_month) do update
set days = excluded.days;
