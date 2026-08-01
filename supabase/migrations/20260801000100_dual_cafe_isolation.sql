-- Dual-cafe isolation for exactly Santara Coffee and Parama Cafe.
--
-- Existing rows are Santara production data and are backfilled to Santara.
-- Parama is intentionally created without menu, transactions, or settings.
-- Each auth account continues to have one profile row, one business, and one
-- role. No membership table or business switcher is introduced.

create table if not exists public.businesses (
  id uuid primary key,
  slug text not null unique
    check (slug in ('santara', 'parama')),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.businesses (id, slug, name)
values
  ('11111111-1111-4111-8111-111111111111', 'santara', 'Santara Coffee'),
  ('22222222-2222-4222-8222-222222222222', 'parama', 'Parama Cafe')
on conflict (id) do update
set slug = excluded.slug,
    name = excluded.name,
    is_active = true;

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

alter table public.profiles add column if not exists business_id uuid;
alter table public.menu_categories add column if not exists business_id uuid;
alter table public.menu_items add column if not exists business_id uuid;
alter table public.transactions add column if not exists business_id uuid;
alter table public.transaction_items add column if not exists business_id uuid;
alter table public.pending_orders add column if not exists business_id uuid;
alter table public.pending_order_items add column if not exists business_id uuid;
alter table public.app_settings add column if not exists business_id uuid;
alter table public.legacy_import_batches add column if not exists business_id uuid;
alter table public.legacy_sales add column if not exists business_id uuid;
alter table public.expenses add column if not exists business_id uuid;
alter table public.daily_closings add column if not exists business_id uuid;
alter table public.google_sheet_sync_settings add column if not exists business_id uuid;
alter table public.google_sheet_sync_logs add column if not exists business_id uuid;

-- All rows that predate this migration belong to Santara.
update public.profiles
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.menu_categories
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.menu_items
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.transactions
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.transaction_items
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.pending_orders
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.pending_order_items
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.app_settings
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.legacy_import_batches
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.legacy_sales
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.expenses
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.daily_closings
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.google_sheet_sync_settings
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;
update public.google_sheet_sync_logs
set business_id = '11111111-1111-4111-8111-111111111111'
where business_id is null;

alter table public.profiles alter column business_id set not null;
alter table public.menu_categories alter column business_id set not null;
alter table public.menu_items alter column business_id set not null;
alter table public.transactions alter column business_id set not null;
alter table public.transaction_items alter column business_id set not null;
alter table public.pending_orders alter column business_id set not null;
alter table public.pending_order_items alter column business_id set not null;
alter table public.app_settings alter column business_id set not null;
alter table public.legacy_import_batches alter column business_id set not null;
alter table public.legacy_sales alter column business_id set not null;
alter table public.expenses alter column business_id set not null;
alter table public.daily_closings alter column business_id set not null;
alter table public.google_sheet_sync_settings alter column business_id set not null;
alter table public.google_sheet_sync_logs alter column business_id set not null;

alter table public.profiles
  add constraint profiles_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.menu_categories
  add constraint menu_categories_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.menu_items
  add constraint menu_items_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.transactions
  add constraint transactions_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.transaction_items
  add constraint transaction_items_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.pending_orders
  add constraint pending_orders_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.pending_order_items
  add constraint pending_order_items_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.app_settings
  add constraint app_settings_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.legacy_import_batches
  add constraint legacy_import_batches_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.legacy_sales
  add constraint legacy_sales_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.expenses
  add constraint expenses_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.daily_closings
  add constraint daily_closings_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.google_sheet_sync_settings
  add constraint google_sheet_sync_settings_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;
alter table public.google_sheet_sync_logs
  add constraint google_sheet_sync_logs_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;

-- Replace global uniqueness with per-business uniqueness.
alter table public.menu_categories
  drop constraint if exists menu_categories_name_key;
alter table public.menu_categories
  add constraint menu_categories_business_name_key unique (business_id, name);

alter table public.transactions
  drop constraint if exists transactions_receipt_number_key;
alter table public.transactions
  add constraint transactions_business_receipt_number_key
  unique (business_id, receipt_number);

alter table public.legacy_import_batches
  drop constraint if exists legacy_import_batches_local_id_key;
alter table public.legacy_import_batches
  add constraint legacy_import_batches_business_local_id_key
  unique (business_id, local_id);

alter table public.legacy_sales
  drop constraint if exists legacy_sales_local_id_key;
alter table public.legacy_sales
  add constraint legacy_sales_business_local_id_key
  unique (business_id, local_id);

alter table public.expenses drop constraint if exists expenses_local_id_key;
alter table public.expenses
  add constraint expenses_business_local_id_key unique (business_id, local_id);

alter table public.daily_closings
  drop constraint if exists daily_closings_local_id_key;
alter table public.daily_closings
  drop constraint if exists daily_closings_closing_date_key;
alter table public.daily_closings
  add constraint daily_closings_business_local_id_key
  unique (business_id, local_id);
alter table public.daily_closings
  add constraint daily_closings_business_date_key
  unique (business_id, closing_date);

alter table public.google_sheet_sync_logs
  drop constraint if exists google_sheet_sync_logs_local_id_key;
alter table public.google_sheet_sync_logs
  add constraint google_sheet_sync_logs_business_local_id_key
  unique (business_id, local_id);

alter table public.app_settings drop constraint if exists app_settings_pkey;
alter table public.app_settings
  add constraint app_settings_pkey primary key (business_id, key);

-- Required parent relationships carry the same business ID, preventing a row
-- from referencing another cafe even if an ID is guessed.
alter table public.transactions
  add constraint transactions_id_business_key unique (id, business_id);
alter table public.pending_orders
  add constraint pending_orders_id_business_key unique (id, business_id);
alter table public.legacy_import_batches
  add constraint legacy_import_batches_id_business_key unique (id, business_id);

alter table public.transaction_items
  drop constraint if exists transaction_items_transaction_id_fkey;
alter table public.transaction_items
  add constraint transaction_items_transaction_business_fkey
  foreign key (transaction_id, business_id)
  references public.transactions(id, business_id) on delete cascade;

alter table public.pending_order_items
  drop constraint if exists pending_order_items_pending_order_id_fkey;
alter table public.pending_order_items
  add constraint pending_order_items_order_business_fkey
  foreign key (pending_order_id, business_id)
  references public.pending_orders(id, business_id) on delete cascade;

alter table public.legacy_sales
  drop constraint if exists legacy_sales_import_batch_id_fkey;
alter table public.legacy_sales
  add constraint legacy_sales_batch_business_fkey
  foreign key (import_batch_id, business_id)
  references public.legacy_import_batches(id, business_id) on delete cascade;

create index if not exists profiles_business_id_idx
  on public.profiles(business_id);
create index if not exists menu_categories_business_sort_idx
  on public.menu_categories(business_id, sort_order);
create index if not exists menu_items_business_category_idx
  on public.menu_items(business_id, category_name);
create index if not exists transactions_business_date_idx
  on public.transactions(business_id, transaction_at);
create index if not exists pending_orders_business_created_idx
  on public.pending_orders(business_id, created_at);
create index if not exists legacy_sales_business_date_idx
  on public.legacy_sales(business_id, sale_date);
create index if not exists expenses_business_date_idx
  on public.expenses(business_id, expense_date);
create index if not exists daily_closings_business_date_idx
  on public.daily_closings(business_id, closing_date);
create index if not exists google_sheet_sync_logs_business_date_idx
  on public.google_sheet_sync_logs(business_id, synced_at);

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

create or replace function public.can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(target_business_id = public.current_business_id(), false)
$$;

revoke all on function public.current_business_id() from public;
revoke all on function public.current_profile_role() from public;
revoke all on function public.is_owner_or_admin() from public;
revoke all on function public.can_access_business(uuid) from public;
grant execute on function public.current_business_id() to authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_owner_or_admin() to authenticated;
grant execute on function public.can_access_business(uuid) to authenticated;

alter table public.businesses enable row level security;

drop policy if exists "Users can read own business" on public.businesses;
create policy "Users can read own business"
on public.businesses
for select
to authenticated
using (id = public.current_business_id());

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Owner admin can manage profiles" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or (public.is_owner_or_admin() and public.can_access_business(business_id))
);
create policy "Owner admin can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_owner_or_admin() and public.can_access_business(business_id))
with check (public.is_owner_or_admin() and public.can_access_business(business_id));

drop policy if exists "Authenticated users can read menu categories" on public.menu_categories;
drop policy if exists "Owner admin can manage menu categories" on public.menu_categories;
create policy "Business staff can read menu categories"
on public.menu_categories for select to authenticated
using (public.can_access_business(business_id));
create policy "Business owner admin can manage menu categories"
on public.menu_categories for all to authenticated
using (public.is_owner_or_admin() and public.can_access_business(business_id))
with check (public.is_owner_or_admin() and public.can_access_business(business_id));

drop policy if exists "Authenticated users can read menu items" on public.menu_items;
drop policy if exists "Owner admin can manage menu items" on public.menu_items;
create policy "Business staff can read menu items"
on public.menu_items for select to authenticated
using (public.can_access_business(business_id));
create policy "Business owner admin can manage menu items"
on public.menu_items for all to authenticated
using (public.is_owner_or_admin() and public.can_access_business(business_id))
with check (public.is_owner_or_admin() and public.can_access_business(business_id));

drop policy if exists "Authenticated users can manage transactions" on public.transactions;
create policy "Business staff can manage transactions"
on public.transactions for all to authenticated
using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists "Authenticated users can manage transaction items" on public.transaction_items;
create policy "Business staff can manage transaction items"
on public.transaction_items for all to authenticated
using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists "Authenticated users can manage pending orders" on public.pending_orders;
create policy "Business staff can manage pending orders"
on public.pending_orders for all to authenticated
using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists "Authenticated users can manage pending order items" on public.pending_order_items;
create policy "Business staff can manage pending order items"
on public.pending_order_items for all to authenticated
using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists "Authenticated users can manage app settings" on public.app_settings;
create policy "Business staff can manage app settings"
on public.app_settings for all to authenticated
using (public.can_access_business(business_id))
with check (public.can_access_business(business_id));

drop policy if exists "Owner admin can manage legacy import batches" on public.legacy_import_batches;
create policy "Business owner admin can manage legacy import batches"
on public.legacy_import_batches for all to authenticated
using (public.is_owner_or_admin() and public.can_access_business(business_id))
with check (public.is_owner_or_admin() and public.can_access_business(business_id));

drop policy if exists "Owner admin can manage legacy sales" on public.legacy_sales;
create policy "Business owner admin can manage legacy sales"
on public.legacy_sales for all to authenticated
using (public.is_owner_or_admin() and public.can_access_business(business_id))
with check (public.is_owner_or_admin() and public.can_access_business(business_id));

drop policy if exists "Owner admin can manage expenses" on public.expenses;
create policy "Business owner admin can manage expenses"
on public.expenses for all to authenticated
using (public.is_owner_or_admin() and public.can_access_business(business_id))
with check (public.is_owner_or_admin() and public.can_access_business(business_id));

drop policy if exists "Owner admin can manage daily closings" on public.daily_closings;
create policy "Business owner admin can manage daily closings"
on public.daily_closings for all to authenticated
using (public.is_owner_or_admin() and public.can_access_business(business_id))
with check (public.is_owner_or_admin() and public.can_access_business(business_id));

drop policy if exists "Owner admin can manage Google Sheet settings" on public.google_sheet_sync_settings;
create policy "Business owner admin can manage Google Sheet settings"
on public.google_sheet_sync_settings for all to authenticated
using (public.is_owner_or_admin() and public.can_access_business(business_id))
with check (public.is_owner_or_admin() and public.can_access_business(business_id));

drop policy if exists "Owner admin can manage Google Sheet sync logs" on public.google_sheet_sync_logs;
create policy "Business owner admin can manage Google Sheet sync logs"
on public.google_sheet_sync_logs for all to authenticated
using (public.is_owner_or_admin() and public.can_access_business(business_id))
with check (public.is_owner_or_admin() and public.can_access_business(business_id));
