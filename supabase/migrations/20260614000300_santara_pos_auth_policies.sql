-- Santara POS Phase 5C auth and RLS hardening.
--
-- This migration replaces Phase 5B temporary anon sync policies with
-- authenticated access. The app now requires Supabase Auth before cloud sync.
-- localStorage remains the first safety layer in the browser.

alter table public.profiles
  add column if not exists email text;

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
$$;

create or replace function public.is_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() in ('owner', 'admin'), false)
$$;

-- Remove Phase 5B temporary anon policies.
drop policy if exists "Phase 5B anon sync profiles" on public.profiles;
drop policy if exists "Phase 5B anon sync menu categories" on public.menu_categories;
drop policy if exists "Phase 5B anon sync menu items" on public.menu_items;
drop policy if exists "Phase 5B anon sync transactions" on public.transactions;
drop policy if exists "Phase 5B anon sync transaction items" on public.transaction_items;
drop policy if exists "Phase 5B anon sync pending orders" on public.pending_orders;
drop policy if exists "Phase 5B anon sync pending order items" on public.pending_order_items;
drop policy if exists "Phase 5B anon sync app settings" on public.app_settings;

-- Remove Phase 5A broad authenticated policies so role rules below are clear.
drop policy if exists "Authenticated users can manage profiles" on public.profiles;
drop policy if exists "Authenticated users can manage menu categories" on public.menu_categories;
drop policy if exists "Authenticated users can manage menu items" on public.menu_items;
drop policy if exists "Authenticated users can manage transactions" on public.transactions;
drop policy if exists "Authenticated users can manage transaction items" on public.transaction_items;
drop policy if exists "Authenticated users can manage pending orders" on public.pending_orders;
drop policy if exists "Authenticated users can manage pending order items" on public.pending_order_items;
drop policy if exists "Authenticated users can manage app settings" on public.app_settings;

-- Profiles:
-- Each signed-in user can read their own profile. Owner/admin can manage user
-- profiles after the first owner profile is created manually in SQL Editor.
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_owner_or_admin());

create policy "Owner admin can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_owner_or_admin())
with check (public.is_owner_or_admin());

-- Menu data:
-- Cashiers can read menu data for sales. Owner/admin can edit menu data.
create policy "Authenticated users can read menu categories"
on public.menu_categories
for select
to authenticated
using (true);

create policy "Owner admin can manage menu categories"
on public.menu_categories
for all
to authenticated
using (public.is_owner_or_admin())
with check (public.is_owner_or_admin());

create policy "Authenticated users can read menu items"
on public.menu_items
for select
to authenticated
using (true);

create policy "Owner admin can manage menu items"
on public.menu_items
for all
to authenticated
using (public.is_owner_or_admin())
with check (public.is_owner_or_admin());

-- POS operations:
-- Any authenticated Santara staff account may sync transactions and pending
-- orders. The app UI limits back-office screens by role.
create policy "Authenticated users can manage transactions"
on public.transactions
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage transaction items"
on public.transaction_items
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage pending orders"
on public.pending_orders
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage pending order items"
on public.pending_order_items
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage app settings"
on public.app_settings
for all
to authenticated
using (true)
with check (true);

-- Production note:
-- These policies intentionally block anon table access. They are a practical
-- single-branch Santara policy set for owner/admin/cashier roles. If the app
-- later supports multiple branches, richer staff management, or public APIs,
-- tighten each policy around branch ownership and explicit role permissions.
