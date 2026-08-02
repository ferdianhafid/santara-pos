alter table public.profiles
  add column if not exists is_active boolean not null default true;

create index if not exists profiles_business_active_idx
  on public.profiles(business_id, is_active);

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id
  from public.profiles
  where id = auth.uid()
    and is_active = true
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
$$;

drop policy if exists "Owner admin can manage expenses" on public.expenses;
drop policy if exists "Business owner admin can manage expenses" on public.expenses;
drop policy if exists "Business staff can manage expenses" on public.expenses;
create policy "Business staff can manage expenses"
on public.expenses for all to authenticated
using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists "Owner admin can manage daily closings" on public.daily_closings;
drop policy if exists "Business owner admin can manage daily closings" on public.daily_closings;
drop policy if exists "Business staff can manage daily closings" on public.daily_closings;
create policy "Business staff can manage daily closings"
on public.daily_closings for all to authenticated
using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));
