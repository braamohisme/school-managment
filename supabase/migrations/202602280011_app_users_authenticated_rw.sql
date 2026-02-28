-- Demo policy to allow approved-logins CRUD from the app.
-- For stricter production security, replace with role-claim-based policies.

drop policy if exists app_users_select_own on public.app_users;
drop policy if exists app_users_authenticated_rw on public.app_users;

create policy app_users_authenticated_rw
on public.app_users
for all
to authenticated
using (true)
with check (true);
