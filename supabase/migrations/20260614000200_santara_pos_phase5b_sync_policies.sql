-- Santara POS Phase 5B temporary sync policies.
--
-- Context:
-- The app does not have login/auth UI yet, but Phase 5B adds autosync from the
-- browser using the Supabase anon key. These policies allow the current trusted
-- Santara POS deployment to sync data before role-based auth exists.
--
-- Important:
-- These are not final production role policies. Replace them with owner/admin/
-- cashier policies when auth is implemented. Do not use these broad anon
-- policies for an untrusted public multi-tenant app.

drop policy if exists "Phase 5B anon sync profiles" on public.profiles;
create policy "Phase 5B anon sync profiles"
on public.profiles
for all
to anon
using (true)
with check (true);

drop policy if exists "Phase 5B anon sync menu categories" on public.menu_categories;
create policy "Phase 5B anon sync menu categories"
on public.menu_categories
for all
to anon
using (true)
with check (true);

drop policy if exists "Phase 5B anon sync menu items" on public.menu_items;
create policy "Phase 5B anon sync menu items"
on public.menu_items
for all
to anon
using (true)
with check (true);

drop policy if exists "Phase 5B anon sync transactions" on public.transactions;
create policy "Phase 5B anon sync transactions"
on public.transactions
for all
to anon
using (true)
with check (true);

drop policy if exists "Phase 5B anon sync transaction items" on public.transaction_items;
create policy "Phase 5B anon sync transaction items"
on public.transaction_items
for all
to anon
using (true)
with check (true);

drop policy if exists "Phase 5B anon sync pending orders" on public.pending_orders;
create policy "Phase 5B anon sync pending orders"
on public.pending_orders
for all
to anon
using (true)
with check (true);

drop policy if exists "Phase 5B anon sync pending order items" on public.pending_order_items;
create policy "Phase 5B anon sync pending order items"
on public.pending_order_items
for all
to anon
using (true)
with check (true);

drop policy if exists "Phase 5B anon sync app settings" on public.app_settings;
create policy "Phase 5B anon sync app settings"
on public.app_settings
for all
to anon
using (true)
with check (true);
