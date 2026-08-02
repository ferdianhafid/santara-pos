alter table public.transaction_items
  add column if not exists notes text not null default '';

alter table public.pending_order_items
  add column if not exists notes text not null default '';

comment on column public.transaction_items.notes is
  'Catatan khusus per item, misalnya less sugar atau less ice.';

comment on column public.pending_order_items.notes is
  'Catatan khusus per item untuk order yang disimpan.';
