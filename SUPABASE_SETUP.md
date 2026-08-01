# Supabase Setup - Santara / Parama POS

The POS is still localStorage-first, but it can sync to Supabase when Supabase
Auth is configured and a staff user is logged in. Each account belongs to
exactly one business and one role.

## 1. Create a Supabase Project

1. Open Supabase and create a new project.
2. Wait until the project finishes provisioning.
3. Open the project dashboard.

## 2. Copy Project Credentials

1. Go to Project Settings.
2. Open API.
3. Copy the Project URL.
4. Copy the anon public key.

Do not commit real keys to GitHub.

## 3. Add Local Environment Variables

Create a local `.env` file in the project root:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The `.env` file is ignored by Git. Keep `.env.example` as the safe template.

## 4. Add Vercel Environment Variables

In Vercel:

1. Open the Santara POS project.
2. Go to Settings.
3. Open Environment Variables.
4. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Redeploy after adding the variables.

## 5. Run Database Migrations

Open Supabase SQL Editor and run these files in order:

1. `supabase/migrations/20260614000100_santara_pos_schema.sql`
2. `supabase/migrations/20260614000200_santara_pos_phase5b_sync_policies.sql`
3. `supabase/migrations/20260614000300_santara_pos_auth_policies.sql`
4. `supabase/migrations/20260614000400_santara_pos_legacy_sales.sql`
5. `supabase/migrations/20260614000500_santara_pos_expenses_closing.sql`
6. `supabase/migrations/20260614000600_santara_pos_phase8_controls.sql`
7. `supabase/migrations/20260801000100_dual_cafe_isolation.sql`
8. `supabase/migrations/20260801000110_dual_cafe_settings_constraint_fix.sql`

The Phase 5C migration removes the temporary anon sync policies and replaces
them with authenticated owner/admin/cashier policies.

The Phase 6 migration adds legacy import tables so old POS sales can be included
in local and cloud-backed reports.

The Phase 7 migration adds expenses, simple daily closings, Google Sheet sync
settings, and Google Sheet sync logs. These tables use owner/admin policies for
expense, closing, and Google Sheet settings because they affect financial
reporting.

The Phase 8 migration adds item-level discount snapshots, pending-order item
discount fields, and void receipt audit fields. Old transactions default to
`completed`, so existing data remains readable.

The dual-cafe migration creates exactly two business records, backfills every
existing row to Santara Coffee, adds business-scoped unique constraints, and
replaces broad authenticated policies with business-scoped RLS. Parama Cafe is
created without menu or operational data.

Apply and verify the dual-cafe migration before deploying the matching frontend
commit. The frontend intentionally fails closed when a signed-in account does
not have a valid business profile.

## 6. Create a Supabase Auth User

1. In Supabase, open Authentication.
2. Go to Users.
3. Click Add user.
4. Enter the owner email and password.
5. Save the user.

## 7. Create the First Owner Profile

After creating an Auth user, run one of the following statements in Supabase SQL
Editor. Replace the example email and name first.

Santara owner:

```sql
insert into public.profiles (id, email, full_name, role, business_id)
select
  id,
  email,
  'Owner Santara',
  'owner',
  '11111111-1111-4111-8111-111111111111'::uuid
from auth.users
where email = 'owner@santara.coffee'
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    business_id = excluded.business_id,
    updated_at = now();
```

Parama owner:

```sql
insert into public.profiles (id, email, full_name, role, business_id)
select
  id,
  email,
  'Owner Parama',
  'owner',
  '22222222-2222-4222-8222-222222222222'::uuid
from auth.users
where email = 'owner@parama.cafe'
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    business_id = excluded.business_id,
    updated_at = now();
```

Roles supported now:

- `owner`: full access
- `admin`: full access
- `cashier`: cashier and receipt history only

There is no membership table. To add another staff account, create one Auth user
and one profile row with exactly one of the two business IDs above and exactly
one supported role.

If a logged-in user has no profile row or has no valid business, the app blocks
access and asks the user to contact an administrator. It never falls back to
Santara data for an authenticated Parama account.

## 8. Current Phase 5C Behavior

- If Supabase env variables are missing, the app stays in local/demo mode.
- If Supabase is configured, users must login before cloud sync.
- localStorage remains the first safety layer and is namespaced by business.
- The sync queue and sync status metadata are also namespaced by business.
- Legacy single-business browser data is migrated once into Santara's local
  namespace.
- The compact sync status shows `Login diperlukan` when cloud sync is waiting
  for login.
- The small `Sync Sekarang` button retries pending sync after login.
- Owner/admin can access Kasir, Kelola Menu, Riwayat Struk, Laporan, and Data
  Lokal backup controls.
- Cashier can access Kasir and Riwayat Struk only.

## 9. What Is Still Not Implemented

- No complex user management UI exists yet.
- Google Sheets sync uses Apps Script Web App URL only, not Google OAuth.
- Expenses and simple daily closing exist for owner/admin.
- No realtime subscriptions exist yet.

## 10. Legacy Import Notes

- Owner/admin can open `Import Data Lama`.
- Cashier cannot see the legacy import tab.
- Legacy sales are included in `Laporan`.
- Legacy sales do not appear in `Riwayat Struk`.
- If Supabase sync fails, imported data remains in localStorage and the sync
  queue retries later.

## 11. Next Phase

The next phase should test the Phase 7 migration, expense sync, daily closing,
and Apps Script Google Sheets sync with real production data.

Read `GOOGLE_SHEETS_SYNC.md` before setting up the Google Sheets endpoint.
