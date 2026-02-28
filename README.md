# School Management App Setup

## 1) Environment variables
Copy `.env.example` to `.env` and set:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_KEY` (anon key only)

Do not commit `.env`.

## 2) Supabase SQL (run in order)
Run the SQL in:

- `supabase/migrations/202602280001_init.sql`
- `supabase/migrations/202602280005_legacy_schema_normalize.sql` (recommended for existing/old Supabase projects)
- `supabase/migrations/202602280003_legacy_grades_scores_fix.sql` (run this if your project already had an old `grades` table)
- `supabase/migrations/202602280004_legacy_attendance_year_month_fix.sql` (run this if your project already had an old `attendance` table)
- `supabase/migrations/202602280006_legacy_attendance_primary_key_fix.sql` (run this if you see duplicate key on `attendance_pkey`)
- `supabase/migrations/202602280007_subjects_table.sql`
- `supabase/migrations/202602280002_seed_demo_data.sql`
- `supabase/migrations/202602280008_seed_subjects.sql`

This creates the tables used by the app and enables RLS.

## 3) Create Supabase Auth users
In Supabase Dashboard:

1. Go to `Authentication` -> `Users`.
2. Click `Add user`.
3. Add these users with **Auto Confirm User = ON**:
   - `admin@school.edu` / `admin123`
   - `teacher@school.edu` / `teacher123`
   - `student@school.edu` / `student123`
   - `driver@school.edu` / `driver123`

## 4) Authentication and roles
Login uses Supabase Auth (`/auth/v1/token`).
After sign-in, the app reads role/profile data from `app_users` table by email.

If env vars are missing, the UI switches to offline demo mode.

## 5) Quick login checklist
1. `.env` exists with correct `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY`.
2. Both SQL files were executed successfully.
3. Auth users were created in Supabase Authentication.
4. Use one of the credentials above to sign in.
