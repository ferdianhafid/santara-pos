alter table public.menu_items
  add column if not exists size_variants jsonb not null default '[]'::jsonb;

alter table public.transaction_items
  add column if not exists size_snapshot text;

alter table public.pending_order_items
  add column if not exists size_snapshot text;

alter table public.expenses
  add column if not exists quantity numeric(12, 3),
  add column if not exists unit text not null default '';

alter table public.daily_closings
  add column if not exists grab_sales numeric(14, 2) not null default 0,
  add column if not exists shopee_sales numeric(14, 2) not null default 0,
  add column if not exists opening_cash numeric(14, 2) not null default 0;

alter table public.transactions
  drop constraint if exists transactions_payment_method_check;

alter table public.transactions
  add constraint transactions_payment_method_check
  check (payment_method in ('Cash', 'QRIS', 'Debit', 'Grab', 'Shopee'));

alter table public.transaction_items
  drop constraint if exists transaction_items_size_snapshot_check;

alter table public.transaction_items
  add constraint transaction_items_size_snapshot_check
  check (size_snapshot is null or size_snapshot in ('M', 'L'));

alter table public.pending_order_items
  drop constraint if exists pending_order_items_size_snapshot_check;

alter table public.pending_order_items
  add constraint pending_order_items_size_snapshot_check
  check (size_snapshot is null or size_snapshot in ('M', 'L'));

alter table public.menu_items
  drop constraint if exists menu_items_size_variants_array_check;

alter table public.menu_items
  add constraint menu_items_size_variants_array_check
  check (jsonb_typeof(size_variants) = 'array');
