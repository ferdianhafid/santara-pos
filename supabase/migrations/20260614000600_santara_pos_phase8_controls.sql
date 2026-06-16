-- Santara POS Phase 8 production controls.
--
-- Adds item discount snapshots and void receipt audit fields. Existing rows are
-- kept as completed receipts with zero item-level discount by default.

alter table public.transactions
  add column if not exists item_discount_amount integer not null default 0
    check (item_discount_amount >= 0),
  add column if not exists transaction_discount_amount integer not null default 0
    check (transaction_discount_amount >= 0),
  add column if not exists status text not null default 'completed'
    check (status in ('completed', 'voided')),
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles(id) on delete set null,
  add column if not exists voided_by_name text,
  add column if not exists void_reason text;

alter table public.transaction_items
  add column if not exists gross_line_total integer not null default 0
    check (gross_line_total >= 0),
  add column if not exists item_discount_type text not null default 'none'
    check (item_discount_type in ('none', 'fixed', 'percentage')),
  add column if not exists item_discount_value numeric(12, 2) not null default 0
    check (item_discount_value >= 0),
  add column if not exists item_discount_amount integer not null default 0
    check (item_discount_amount >= 0),
  add column if not exists line_net_total integer not null default 0
    check (line_net_total >= 0),
  add column if not exists unit_hpp_snapshot integer not null default 0
    check (unit_hpp_snapshot >= 0),
  add column if not exists total_hpp integer not null default 0
    check (total_hpp >= 0),
  add column if not exists profit integer not null default 0;

alter table public.pending_order_items
  add column if not exists item_discount_type text not null default 'none'
    check (item_discount_type in ('none', 'fixed', 'percentage')),
  add column if not exists item_discount_value numeric(12, 2) not null default 0
    check (item_discount_value >= 0),
  add column if not exists item_discount_amount integer not null default 0
    check (item_discount_amount >= 0);

update public.transaction_items
set gross_line_total = case when gross_line_total = 0 then subtotal else gross_line_total end,
    line_net_total = case when line_net_total = 0 then subtotal else line_net_total end,
    unit_hpp_snapshot = case when unit_hpp_snapshot = 0 then hpp_snapshot else unit_hpp_snapshot end,
    total_hpp = case when total_hpp = 0 then hpp_snapshot * quantity else total_hpp end,
    profit = case when profit = 0 then subtotal - (hpp_snapshot * quantity) else profit end;

update public.transactions
set transaction_discount_amount = case
      when transaction_discount_amount = 0 then discount_amount - item_discount_amount
      else transaction_discount_amount
    end
where discount_amount >= item_discount_amount;

create index if not exists transactions_status_idx
  on public.transactions(status);

-- RLS note:
-- Phase 5C already restricts transaction and menu writes to authenticated
-- Santara users. Owner/admin/cashier UI permissions are enforced in the app.
-- No anon policies are added here.
