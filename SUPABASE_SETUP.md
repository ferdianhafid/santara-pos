# Supabase Setup - Santara POS

This project is still localStorage-first after Phase 5A. Supabase files are
prepared so the next phase can add a data service and sync safely.

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

## 5. Run the Migration SQL

1. Open Supabase SQL Editor.
2. Open this repository file:
   `supabase/migrations/20260614000100_santara_pos_schema.sql`
3. Copy the SQL.
4. Paste it into Supabase SQL Editor.
5. Run it.

The migration creates tables for menu data, transactions, transaction item
snapshots, pending orders, profiles, and app settings.

## 6. Run the Phase 5B Temporary Sync Policies

Phase 5B adds autosync before login/auth exists. To let the deployed app sync
with the anon key, also run:

`supabase/migrations/20260614000200_santara_pos_phase5b_sync_policies.sql`

These policies are intentionally temporary. They should be replaced with tighter
owner/admin/cashier policies when auth is implemented.

## 7. Current Phase 5B Behavior

- The app still works without Supabase environment variables.
- If Supabase variables are missing or Supabase is unavailable, the app continues in localStorage mode.
- Important changes are queued locally and retried automatically.
- A compact sync indicator appears in the header.
- No login/auth UI exists yet.
- Supabase sync is best-effort and localStorage remains the first safety layer.
- Existing cashier, reports, receipt, backup, and local persistence behavior is unchanged.

## 8. Next Phase

The next Supabase phase should add proper auth and role-based RLS policies, then
remove the temporary anon sync policies.
