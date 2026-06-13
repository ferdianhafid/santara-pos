# Santara POS - Project Status

## Current Deployment

* App has been deployed to Vercel and is working.
* GitHub default branch should be `main`.
* Future work must use `main` only.
* Do not push to `master`.

## Current Implemented Features

The app currently has:

* Vite React TypeScript app
* Tailwind CSS
* Tablet-first cashier UI
* Santara branding and slogan
* Menu categories and items
* Cart
* Quantity controls
* Checkout
* Cash, QRIS, Debit payment
* Cash paid amount and change calculation
* Transaction-level discount
* 58mm receipt preview
* Browser print
* Pending cart / hold orders
* Custom app modals, no browser prompt/confirm/alert
* Kelola Menu
* Add/edit menu
* Edit price
* Edit HPP
* Active/inactive menu
* Custom category dropdown
* HPP transaction snapshots
* Riwayat Struk
* Receipt detail
* Receipt reprint
* Branch mismatch was fixed, latest work is on `main`

## Important Current Limitation

* Data is still local state / not persistent enough for real use.
* Refreshing or reopening the app may lose some data unless local persistence has been implemented.
* There is no Supabase/database yet.
* There is no Google Sheets sync yet.
* There is no full report page yet.
* There is no legacy import yet.

## Next Recommended Phase

The next phase should be:

Phase 3.5 - Local Persistence and Backup Safety

Goal:

* Persist menu edits
* Persist HPP edits
* Persist active/inactive menu status
* Persist pending orders
* Persist completed transactions / receipt history
* Persist receipt numbering
* Add Export Backup JSON
* Add Import Backup JSON
* Add Reset Local Data with custom confirmation modal

## Future Roadmap

Phase 4 - Reports

* Daily report
* Monthly report
* All-time report
* Gross sales
* Discount
* Net sales
* HPP
* Gross profit
* Gross margin
* Expenses later
* Net profit later
* Payment summary
* Menu sales summary
* Best seller

Phase 5 - Legacy Sales Import

* Import old POS sales from CSV/XLSX
* Include legacy data in all-time reports

Phase 6 - Export and Google Sheets Sync

* Export CSV/XLSX
* One-click sync to Google Sheets

Phase 7 - Supabase/database

* Auth
* Persist real operational data
* Roles: owner/admin/cashier

## Rules for Future Codex Tasks

* Always read `PROJECT_BRIEF.md` and `PROJECT_STATUS.md` before coding.
* Always work only on `main`.
* Never push to `master`.
* Always run build before and after changes.
* Always create/check a safe checkpoint before changes.
* Do not implement more than one phase at a time.
* Keep cashier UI simple.
* Do not add complicated inventory, membership, coupon, or promo automation unless requested.
* Preserve receipt print CSS.
* Preserve warm Santara UI style.
* Prefer small safe commits.

## Recommended Prompt Header for Future Tasks

“Work only in `Ferdian-99/santara-pos`.
Use branch `main` only.
Do not push to `master`.
Do not touch any other repository.
Read `PROJECT_BRIEF.md` and `PROJECT_STATUS.md` first.
Before changes, run git status, git pull origin main, and npm.cmd run build.
Do not continue if build fails or working tree is not clean.
Implement only the requested phase.
After changes, run npm.cmd run build, commit, and push to origin/main.”
