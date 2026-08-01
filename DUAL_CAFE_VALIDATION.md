# Dual-Cafe Production Validation

Run this checklist after applying both `20260801` migrations and before
deploying the matching frontend.

## 1. Structural checks

Run in Supabase SQL Editor:

```sql
select id, slug, name, is_active
from public.businesses
order by slug;
```

Expected: exactly `parama` and `santara`.

Verify no migrated row was left without a business:

```sql
select 'profiles' as table_name, count(*) as missing from public.profiles where business_id is null
union all select 'menu_categories', count(*) from public.menu_categories where business_id is null
union all select 'menu_items', count(*) from public.menu_items where business_id is null
union all select 'transactions', count(*) from public.transactions where business_id is null
union all select 'transaction_items', count(*) from public.transaction_items where business_id is null
union all select 'pending_orders', count(*) from public.pending_orders where business_id is null
union all select 'pending_order_items', count(*) from public.pending_order_items where business_id is null
union all select 'app_settings', count(*) from public.app_settings where business_id is null
union all select 'legacy_import_batches', count(*) from public.legacy_import_batches where business_id is null
union all select 'legacy_sales', count(*) from public.legacy_sales where business_id is null
union all select 'expenses', count(*) from public.expenses where business_id is null
union all select 'daily_closings', count(*) from public.daily_closings where business_id is null
union all select 'google_sheet_sync_settings', count(*) from public.google_sheet_sync_settings where business_id is null
union all select 'google_sheet_sync_logs', count(*) from public.google_sheet_sync_logs where business_id is null;
```

Expected: every `missing` value is `0`.

Verify Parama starts empty:

```sql
select 'menu_categories' as table_name, count(*) as row_count
from public.menu_categories
where business_id = '22222222-2222-4222-8222-222222222222'
union all select 'menu_items', count(*) from public.menu_items where business_id = '22222222-2222-4222-8222-222222222222'
union all select 'transactions', count(*) from public.transactions where business_id = '22222222-2222-4222-8222-222222222222'
union all select 'pending_orders', count(*) from public.pending_orders where business_id = '22222222-2222-4222-8222-222222222222'
union all select 'legacy_sales', count(*) from public.legacy_sales where business_id = '22222222-2222-4222-8222-222222222222'
union all select 'expenses', count(*) from public.expenses where business_id = '22222222-2222-4222-8222-222222222222'
union all select 'daily_closings', count(*) from public.daily_closings where business_id = '22222222-2222-4222-8222-222222222222';
```

Expected: every `row_count` value is `0` before Parama testing begins.

## 2. Account setup

Create one test account for Santara and one for Parama. Give each account one
profile row using the examples in `SUPABASE_SETUP.md`. Do not reuse one Auth user
for both businesses.

## 3. RLS matrix

Using the deployed app or separate authenticated API sessions, verify:

| Test | Santara account | Parama account |
|---|---|---|
| Reads Santara menu | Allowed | Empty/denied |
| Reads Parama menu | Empty/denied | Allowed |
| Creates own transaction | Allowed | Allowed |
| Creates other-business row | Denied | Denied |
| Reads other-business receipt | Empty/denied | Empty/denied |
| Reads other-business expense | Empty/denied | Empty/denied |
| Uses other-business Google Sheet settings | Empty/denied | Empty/denied |

Also verify a signed-in Auth user without a valid profile sees the blocked
profile screen and never sees Santara or Parama operational data.

## 4. Browser/offline regression

For each business account:

1. Sign in and confirm the correct business name is visible.
2. Refresh and confirm the same business data returns.
3. Go offline, create a safe test item/order, and confirm the pending sync count.
4. Go online and confirm only that business receives the queued operation.
5. Sign out, sign in as the other business, and confirm no menu, receipt,
   pending order, expense, counter, or sync status crosses over.
6. Export a backup and confirm importing it into the other business is rejected.

For Santara, repeat the existing cashier regression: cart, item discount,
transaction discount, hold/resume, Cash/QRIS/Debit, receipt/reprint/void,
reports, expenses, closing, legacy import, and Google Sheets sync.

## 5. Gate result

Branding work may begin only when every check above passes. Android work may
begin only after branding passes its own web regression. Thermal printing may
begin only after the Android shell passes device testing.

## Production run log — 2026-08-01

Completed:

- Created and verified the RLS-protected
  `backup_pre_dual_cafe_20260801` backup schema.
- Applied both `20260801` migrations to production in one transaction.
- Passed structural, backfill, Parama-empty, row-preservation, constraint, and
  policy checks.
- Created separate Santara and Parama owner profiles.
- Confirmed Parama can write to its own business and is denied a Santara write.
- Confirmed the production app switches from populated Santara data to an empty
  Parama workspace without crossing menu or receipt data.
- Created, synced, and deleted a Parama-only category; confirmed no test row
  remained.

Still required before the branding gate passes:

- Offline queue and reconnect test for each business.
- Cross-account checks for pending orders, expenses, counters, sync metadata,
  and backup import rejection.
- Full Santara cashier, receipt, report, expense, closing, legacy import, and
  Google Sheets regression.
