-- Profile mutations are intentionally server-only through the manage-staff
-- Edge Function. Owners/admins retain read access to staff in their business,
-- while no browser client can promote roles or move profiles between cafes.
drop policy if exists "Authenticated users can manage profiles" on public.profiles;
drop policy if exists "Owner admin can manage profiles" on public.profiles;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or (public.is_owner_or_admin() and public.can_access_business(business_id))
);
