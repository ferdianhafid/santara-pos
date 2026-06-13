# Santara POS — Project Brief

## 1. Project Identity

Project name: **Santara POS**

Repository: **Ferdian-99/santara-pos**

Business name: **Santara Coffee**

Slogan: **Ruang untuk cerita, jeda untuk jiwa**

WiFi password to show on receipt: **chillwithsantara**

This project is a new standalone POS system for Santara Coffee. It must not modify, depend on, or interfere with the existing website repository named `ambara-website`.

## 2. Main Goal

Build a simple, clean, tablet-friendly POS application for Santara Coffee that can run well on iPad, Android tablet, laptop, and desktop browser.

The app should feel simple for daily cashier use, but complete enough for owner/admin reporting.

Main goals:

* Fast cashier workflow.
* Menu management.
* Payment support for Cash, QRIS, and Debit.
* Cash input with automatic change calculation.
* 58mm receipt printing.
* Daily reports.
* All-time reports.
* HPP/COGS tracking.
* Gross margin and net margin calculation.
* Discount support.
* Legacy sales import from old POS data.
* One-click report export/sync to Google Sheets later.

## 3. Recommended Tech Stack

Use a lightweight modern web app stack:

* Vite
* React
* TypeScript
* Tailwind CSS
* Supabase for database and auth
* PWA support for tablet installability
* Browser print for MVP receipt printing
* Google Sheets sync in later phase

The app should be optimized as a responsive PWA, not separate native iOS/Android apps.

## 4. User Roles

The app should support these roles:

### Owner/Admin

Can access:

* Cashier page
* Menu management
* HPP settings
* Reports
* Legacy import
* Expenses
* Shift closing
* Google Sheets sync settings

### Cashier

Can access:

* Cashier page
* Checkout
* Print receipt
* View current shift summary

Cashier should not access sensitive all-time financial settings unless allowed.

## 5. Core Pages

### 5.1 Login Page

Simple login page using Supabase auth.

### 5.2 Cashier Page

Tablet-first layout.

Must include:

* Menu categories
* Menu item buttons
* Cart
* Quantity controls
* Notes per order/item
* Discount input
* Payment method
* Cash input
* Change calculation
* Checkout button
* Print receipt button after transaction

The cashier interface must stay simple and fast.

### 5.3 Menu Management Page

Admin-only.

Must support:

* Add menu item
* Edit menu item
* Disable/enable menu item
* Set category
* Set price
* Set size variants, if any
* Set HPP/COGS
* Set item as active/inactive

### 5.4 Reports Page

Admin-only.

Must support:

* Today report
* Daily report by date
* Monthly report
* All-time report
* Menu sales report
* Payment method report
* Discount report
* HPP report
* Gross profit and margin report
* Net profit report if expenses exist

### 5.5 Expenses Page

Admin-only.

Used to record daily expenses such as:

* Milk
* Ice
* Sugar
* Coffee beans
* Cups
* Gas
* Internet
* Other cafe expenses

Expenses affect net profit, not gross profit.

### 5.6 Legacy Sales Import Page

Admin-only.

Used to import old sales data from the previous POS system.

### 5.7 Shift Closing Page

Admin or cashier depending on permission.

Used to close daily/shift sales.

Must show:

* Cash sales
* QRIS sales
* Debit sales
* Total sales
* Total discount
* Total transactions
* Total expenses
* Expected cash
* Actual cash input
* Cash difference

## 6. Initial Menu Data

Use these initial Santara menu categories and items. Prices and HPP can be adjusted later in the admin page.

### Basic Coffee

* Americano
* Ice Latte
* Vietnam Drip

### Signature

* Santara Coffee
* Scotchtie
* Kopsu Gula Aren
* Creamy Tiramisu
* Caramel Sea Salt
* Matcha Boost
* Choco Strawberry
* Lemon Americano
* Tropical Americano

### Milk Base

* Matcha
* Pingky Matcha
* Chocolate
* Red Velvet
* Korean Strawberry Milk

### Tea & Others

* Black Tea
* Lychee Tea
* Lemon Tea
* Mineral Water

### Main Dish

* Mie Rebus
* Mie Goreng
* Telur

### Snack

* French Fries
* Mix Platter
* Churros

Menu names can be edited later by admin.

## 7. Cart and Checkout Rules

The cart must support:

* Add item
* Remove item
* Increase quantity
* Decrease quantity
* Add note
* Show subtotal
* Show discount
* Show final total

Each cart item must store a price snapshot. If menu prices change later, old transactions must not change.

Each transaction item must store:

* Menu item name snapshot
* Category snapshot
* Size snapshot, if any
* Unit price snapshot
* Quantity
* Subtotal
* HPP snapshot

## 8. Payment Methods

The system must support:

### Cash

Cashier inputs customer money.

System calculates:

* Total after discount
* Paid amount
* Change amount

### QRIS

For MVP, QRIS can be a payment method option.

Later, QRIS image can be shown during checkout.

### Debit

Debit payment method should exist even though the cafe does not have an EDC machine yet.

For now, debit is recorded manually as payment method.

## 9. Discount Feature

Discount must exist from the early version because it affects reports and profit.

### MVP Discount Type

Support transaction-level discount:

* Fixed amount discount, example: Rp5.000
* Percentage discount, example: 10%

Item-level discount can be added later, but it is not required for MVP.

### Checkout Display

Checkout must show:

* Subtotal before discount
* Discount type
* Discount amount
* Final total after discount
* Payment method
* Paid amount for cash
* Change amount for cash

### Receipt Display

Receipt must show discount clearly only when discount exists.

Example:

Subtotal: Rp50.000
Discount: -Rp5.000
Total: Rp45.000

### Report Rules

Reports must track:

* Gross sales before discount
* Total discount
* Net sales after discount
* HPP/COGS
* Gross profit after discount
* Gross margin after discount

Profit must be calculated using net sales after discount.

Formula:

Gross Sales = total item price before discount
Net Sales = gross sales - discount
Gross Profit = net sales - HPP
Gross Margin = gross profit / net sales

### Data Rules

Every transaction must store:

* `discount_type`
* `discount_value`
* `discount_amount`
* `subtotal_before_discount`
* `total_after_discount`

Old reports must not change if future discount rules change.

## 10. Receipt Rules

Receipt must be optimized for 58mm thermal paper.

Receipt width target:

* 58mm paper
* Clean mono layout
* Readable font size
* Simple and elegant

Receipt should include:

* Santara logo at the top
* Santara Coffee name
* Slogan: Ruang untuk cerita, jeda untuk jiwa
* Receipt number
* Date and time
* Cashier name
* Order type if available: dine in/take away
* Item list
* Quantity
* Price
* Subtotal
* Discount if any
* Total
* Payment method
* Paid amount for cash
* Change for cash
* WiFi password: chillwithsantara
* Thank you message

Footer text:

“Terima kasih sudah singgah di Santara.”

For MVP, use browser print first.

Direct thermal printer integration using ESC/POS can be added later after confirming printer model and connection method.

## 11. Reports

Reports are a major feature.

The report system must calculate from real transaction data, not only from exported sheets.

### 11.1 Daily Report

Must include:

* Date
* Total gross sales before discount
* Total discount
* Net sales after discount
* Total HPP/COGS
* Gross profit
* Gross margin
* Total expenses
* Net profit
* Net margin
* Total transactions
* Average transaction value
* Total cash sales
* Total QRIS sales
* Total debit sales
* Menu quantity sold
* Sales by category
* Best-selling menu

### 11.2 Monthly Report

Must include:

* Total gross sales
* Total discount
* Net sales
* HPP
* Gross profit
* Gross margin
* Expenses
* Net profit
* Net margin
* Total transactions
* Best-selling items
* Sales by payment method
* Sales by category

### 11.3 All-Time Report

The app must include all-time reporting.

All-time report must include both:

1. Transactions created in the new Santara POS.
2. Imported legacy sales from the old POS.

Must include:

* All-time gross sales
* All-time discount
* All-time net sales
* All-time HPP
* All-time gross profit
* All-time gross margin
* All-time expenses
* All-time net profit
* All-time transaction count
* All-time items sold
* All-time best-selling menu
* All-time payment method summary
* All-time category summary

## 12. Legacy Sales Import

Santara Coffee has already been running using an older POS app. The new POS must support importing historical sales data so the reports remain complete.

### Goal

Allow owner/admin to import old sales data from CSV/XLSX files without manually entering every transaction.

### Import Page

Create admin-only page:

**Import Data Lama**

The import should support CSV/XLSX files with columns such as:

* Date
* Menu Name
* Category
* Size
* Quantity Sold
* Gross Sales
* Discount, if available
* Net Sales, if available
* Payment Method
* HPP/COGS, if available
* Notes, optional

### Import Metadata

Imported data must be marked clearly:

* `source = legacy_import`
* `import_batch_id`
* `imported_at`
* `imported_by`

### Preview Before Save

Before saving imported data, show preview so owner can check:

* Date mapping
* Menu name mapping
* Quantity
* Sales amount
* HPP
* Payment method

### HPP Handling

If imported file contains HPP, use imported HPP.

If imported file does not contain HPP, owner can choose:

1. Use current menu HPP.
2. Input manual HPP per menu.
3. Import without HPP and mark profit calculation as incomplete.

### Duplicate Protection

The system should warn if the same date range or file appears to have been imported before.

Do not permanently delete imported data by default.

Allow owner to archive or disable an import batch.

### Reporting Rule

Legacy imported sales must be included in all-time report and optional date-based reports.

Reports should be able to filter:

* POS only
* Legacy import only
* Combined

Default report mode should be combined.

## 13. Google Sheets / Google Drive Report Sync

Final goal: one-click report sync to Google Sheets.

The app should have a button:

**Sync Laporan ke Google Sheets**

For MVP, export CSV/XLSX can be implemented first.

Google Sheets sync can be implemented after internal reports are correct.

### Sync Flow

1. Owner opens report page.
2. Owner selects date or report period.
3. System calculates report.
4. System shows report preview.
5. Owner clicks sync.
6. System updates Google Sheets.

### Suggested Sheets Tabs

The Google Sheet should ideally contain:

#### Daily Summary

Columns:

* Date
* Gross Sales
* Discount
* Net Sales
* HPP
* Gross Profit
* Gross Margin
* Expenses
* Net Profit
* Net Margin
* Cash Sales
* QRIS Sales
* Debit Sales
* Total Transactions

#### Menu Sales

Columns:

* Date
* Category
* Menu Name
* Size
* Quantity Sold
* Gross Sales
* Discount Allocation
* Net Sales
* HPP
* Profit

#### Transactions

Columns:

* Receipt Number
* Date
* Time
* Cashier
* Payment Method
* Subtotal Before Discount
* Discount
* Total After Discount
* Paid Amount
* Change Amount
* Source

#### Expenses

Columns:

* Date
* Expense Name
* Category
* Amount
* Notes

#### Closing Shift

Columns:

* Date
* Cashier
* Cash Sales
* QRIS Sales
* Debit Sales
* Total Sales
* Expenses
* Expected Cash
* Actual Cash
* Difference
* Notes

## 14. Database Design Concept

Use Supabase/PostgreSQL.

Suggested tables:

### profiles

* id
* email
* full_name
* role
* created_at

### menu_categories

* id
* name
* sort_order
* is_active
* created_at

### menu_items

* id
* category_id
* name
* description
* base_price
* hpp
* is_active
* is_signature
* created_at
* updated_at

### menu_item_variants

For size variants such as M/L if needed.

* id
* menu_item_id
* name
* price
* hpp
* is_active

### transactions

* id
* receipt_number
* transaction_date
* cashier_id
* subtotal_before_discount
* discount_type
* discount_value
* discount_amount
* total_after_discount
* payment_method
* paid_amount
* change_amount
* status
* source
* notes
* created_at

### transaction_items

* id
* transaction_id
* menu_item_id
* menu_name_snapshot
* category_name_snapshot
* variant_name_snapshot
* unit_price_snapshot
* hpp_snapshot
* quantity
* subtotal
* created_at

### expenses

* id
* expense_date
* name
* category
* amount
* notes
* created_by
* created_at

### legacy_import_batches

* id
* file_name
* date_start
* date_end
* total_rows
* status
* imported_by
* imported_at
* notes

### legacy_sales

* id
* import_batch_id
* sale_date
* menu_name
* category_name
* variant_name
* quantity
* gross_sales
* discount_amount
* net_sales
* hpp_total
* payment_method
* notes
* is_active
* created_at

### shift_closings

* id
* closing_date
* cashier_id
* cash_sales
* qris_sales
* debit_sales
* total_sales
* total_discount
* total_expenses
* expected_cash
* actual_cash
* difference
* notes
* created_at

## 15. Important Calculation Rules

### Gross Sales

Total before discount.

### Net Sales

Gross sales minus discount.

### HPP/COGS

Total cost of goods sold.

### Gross Profit

Net sales minus HPP.

### Gross Margin

Gross profit divided by net sales.

### Net Profit

Gross profit minus expenses.

### Net Margin

Net profit divided by net sales.

### Important Rule

Always store snapshots for price, HPP, discount, and item name at transaction time.

Old reports must never change just because menu price or HPP is edited later.

## 16. PWA and Device UX

The app should be comfortable on:

* iPad
* Android tablet
* Laptop
* Desktop browser

Design priorities:

* Large buttons
* Fast cart interaction
* Minimal typing
* Clear payment flow
* Easy print
* Clean report view

Mobile phone support is nice to have, but tablet is the priority.

## 17. Visual Style

Use a warm, clean, modern cafe aesthetic.

Avoid overly complex visuals.

Suggested feeling:

* Warm
* Minimal
* Cozy
* Premium but simple
* Easy to read

The cashier page should prioritize speed over decoration.

## 18. Assets

Logo should be placed later in:

`public/assets/santara-logo.png`

QRIS image should be placed later in:

`public/assets/qris.png`

Do not hardcode missing assets in a way that breaks the app. Use fallback text if asset is missing.

## 19. Non-Goals for MVP

Do not implement these in the first version unless explicitly requested:

* Customer membership
* Loyalty points
* Complex coupon system
* Automatic promo scheduler
* Online ordering
* Delivery integration
* Inventory automation
* Multi-branch system
* Direct bank reconciliation
* Complex accounting
* Native mobile app
* Direct ESC/POS printer driver

Keep the system simple and usable first.

## 20. Development Phases

### Phase 1 — Foundation and Cashier UI

Implement:

* Vite React TypeScript setup
* Tailwind CSS
* PWA-friendly structure
* Basic layout
* Login placeholder or Supabase auth foundation
* Cashier page
* Initial menu categories and menu items
* Cart system
* Quantity controls
* Subtotal calculation

Do not implement reports, Google Sheets, or legacy import in this phase.

### Phase 2 — Checkout, Payment, and Receipt

Implement:

* Cash checkout
* QRIS payment method
* Debit payment method
* Cash paid amount input
* Change calculation
* Discount per transaction
* Save transaction
* Transaction item snapshots
* 58mm receipt preview
* Browser print button

### Phase 3 — Admin Menu and HPP

Implement:

* Menu management
* Category management
* Price editing
* HPP editing
* Active/inactive menu toggle
* HPP snapshot on transaction

### Phase 4 — Reports

Implement:

* Today report
* Daily report
* Monthly report
* All-time report
* Menu sales report
* Payment method summary
* Discount summary
* HPP summary
* Gross profit
* Gross margin
* Expenses
* Net profit
* Net margin

### Phase 5 — Legacy Sales Import

Implement:

* CSV/XLSX import page
* Import preview
* Column mapping
* Save import batch
* Include legacy sales in all-time and date-based reports
* Duplicate warning

### Phase 6 — Export and Google Sheets Sync

Implement:

* Export CSV/XLSX
* Google Sheets settings
* One-click sync to Google Sheets
* Sync status
* Error handling

## 21. Codex Working Rules

Codex must always read this file before starting a task.

Codex must work phase by phase.

Codex must not implement all phases at once.

Codex must not modify unrelated repositories.

Codex must not touch `ambara-website`.

Codex must keep the cashier interface simple.

Codex must run build/tests after meaningful changes.

Codex must clearly summarize:

* What changed
* Files changed
* How to run
* Any migration required
* Any manual setup needed

## 22. First Codex Task

After this file exists in the root of the repository, the first Codex task should be:

Read `PROJECT_BRIEF.md` and implement Phase 1 only.

Create a Vite React TypeScript PWA-friendly Santara POS app optimized for iPad and Android tablet cashier use.

Implement:

* Basic project setup
* Tailwind CSS
* Clean tablet-first layout
* Cashier page
* Menu categories from the brief
* Menu item buttons
* Cart system
* Quantity controls
* Subtotal calculation

Do not implement checkout payment, receipt printing, reports, Google Sheets, or legacy import yet.

Do not touch any repository except `Ferdian-99/santara-pos`.
