# Santara / Parama POS Roadmap

## Baseline audit

Safe baseline: `09ceaed65dbc0382ce962ccdb5578b456db916fd`

The baseline build passes on `main`. The existing cashier, checkout, receipt,
menu administration, reports, expenses, closing, legacy import, Google Sheets
sync, local persistence, and Supabase sync flows remain the regression surface
for this roadmap.

The audit found four isolation gaps that must be closed together:

1. Existing RLS policies allow authenticated users to access rows without a
   business boundary.
2. Existing unique constraints such as receipt number, category name, local ID,
   and daily closing date are global instead of per business.
3. Browser app data, sync queues, and sync metadata use a single Santara key.
4. The empty-cloud fallback uses Santara's initial menu, which would incorrectly
   seed a new Parama account.

## Fixed tenancy model

- Exactly two businesses: `santara` and `parama`.
- One authenticated account belongs to exactly one business.
- One authenticated account has exactly one role: `owner`, `admin`, or
  `cashier`.
- There is no membership or account/business switcher table.
- Santara receives all existing rows during migration.
- Parama starts empty.
- Local/demo mode remains Santara-only for backwards compatibility.

## Phase gates

### Phase 1 — Database and RLS foundation

- Add the two fixed businesses.
- Add a required `business_id` to every business-owned table.
- Backfill all existing rows and profiles to Santara.
- Replace global unique constraints with business-scoped constraints.
- Replace broad authenticated policies with business-scoped RLS.
- Build and review migration before continuing.

### Phase 2 — Frontend and offline isolation

- Resolve the signed-in user's business from their profile.
- Block cloud use when a profile has no valid business.
- Namespace app state, sync queue, and sync metadata by business.
- Migrate the legacy browser keys to Santara once.
- Add `business_id` to every cloud write and explicit business filters to reads.
- Keep Parama local/cloud data empty when no rows exist.
- Use business-specific receipt prefixes (`SAN` and `PAR`).
- Run build and regression checks before continuing.

### Phase 3 — Branding

- Add business-owned branding fields and safe defaults.
- Replace hardcoded Santara identity only after isolation is proven.
- Preserve the current Santara appearance and receipt output.
- Keep Parama branding independently editable.

### Phase 4 — Android foundation

- Add Capacitor only after web branding passes regression.
- Keep one shared React application and one neutral Android package.
- Validate navigation, keyboard, rotation, safe areas, and offline behavior before
  printer work.

### Phase 5 — Thermal printing

- Introduce an isolated printer service and business-owned printer profiles.
- Start with one tested Bluetooth 58 mm printer.
- Add 80 mm formatting after 58 mm passes physical-device testing.
- Add LAN/USB only when required and tested.
- A failed print must never roll back an already-saved transaction.

## Deployment notes

Database migration and frontend deployment are separate release steps. The
dual-cafe frontend must not be deployed against a database that has not received
the dual-cafe migration. Supabase migrations must be applied and verified before
the corresponding Vercel build is promoted.
