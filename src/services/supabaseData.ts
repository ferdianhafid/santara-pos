import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  AppStateData,
  CompletedTransaction,
  DiscountType,
  MenuItem,
  PaymentMethod,
  PendingOrder,
  TransactionItem,
} from '../types';
import type { SyncOperation } from './syncQueue';

type DbRow = Record<string, unknown>;

const CASHIER_NAME = 'Santara Cashier';

export function canUseSupabase() {
  return isSupabaseConfigured && Boolean(supabase);
}

export async function pushSyncOperation(operation: SyncOperation) {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const payload = operation.payload;

  if (operation.type === 'menu-snapshot-upsert' && 'menuItems' in payload) {
    await upsertMenuItems(payload.menuItems);
    return;
  }

  if (operation.type === 'transaction-upsert' && 'transaction' in payload) {
    await upsertTransaction(payload.transaction);
    return;
  }

  if (operation.type === 'pending-order-upsert' && 'pendingOrder' in payload) {
    await upsertPendingOrder(payload.pendingOrder);
    return;
  }

  if (operation.type === 'pending-order-delete' && 'pendingOrderId' in payload) {
    await deletePendingOrder(payload.pendingOrderId);
    return;
  }

  if (operation.type === 'app-settings-upsert' && 'receiptCounter' in payload) {
    await upsertReceiptCounter(payload.receiptCounter);
  }
}

export async function pullCloudAppState(
  currentData: AppStateData,
): Promise<AppStateData | null> {
  if (!supabase) {
    return null;
  }

  const [menuItems, completedTransactions, pendingOrders, receiptCounter] =
    await Promise.all([
      fetchMenuItems(),
      fetchTransactions(),
      fetchPendingOrders(),
      fetchReceiptCounter(),
    ]);

  const hasCloudData =
    menuItems.length > 0 ||
    completedTransactions.length > 0 ||
    pendingOrders.length > 0 ||
    receiptCounter !== null;

  if (!hasCloudData) {
    return null;
  }

  return {
    menuItems: menuItems.length > 0 ? menuItems : currentData.menuItems,
    pendingOrders:
      pendingOrders.length > 0 || currentData.pendingOrders.length === 0
        ? pendingOrders
        : currentData.pendingOrders,
    completedTransactions:
      completedTransactions.length > 0
        ? mergeTransactions(currentData.completedTransactions, completedTransactions)
        : currentData.completedTransactions,
    receiptCounter: Math.max(
      currentData.receiptCounter,
      receiptCounter ?? 0,
      getReceiptCounterFromTransactions(completedTransactions),
    ),
  };
}

async function upsertMenuItems(menuItems: MenuItem[]) {
  if (!supabase || menuItems.length === 0) {
    return;
  }

  const categoryNames = Array.from(
    new Set(menuItems.map((item) => item.category).filter(Boolean)),
  );
  const categories = categoryNames.map((name, index) => ({
    id: stableUuid('category', name),
    name,
    sort_order: index,
    is_active: true,
  }));

  if (categories.length > 0) {
    const { error } = await supabase
      .from('menu_categories')
      .upsert(categories, { onConflict: 'id' });
    throwIfError(error, 'Gagal menyinkronkan kategori menu.');
  }

  const rows = menuItems.map((item) => ({
    id: stableUuid('menu', item.id),
    category_id: stableUuid('category', item.category),
    category_name: item.category,
    name: item.name,
    price: item.price,
    hpp: item.hpp,
    is_active: item.isActive,
  }));
  const { error } = await supabase
    .from('menu_items')
    .upsert(rows, { onConflict: 'id' });

  throwIfError(error, 'Gagal menyinkronkan menu.');
}

async function upsertTransaction(transaction: CompletedTransaction) {
  if (!supabase) {
    return;
  }

  const transactionId = stableUuid('transaction', transaction.receiptNumber);
  const { error: transactionError } = await supabase.from('transactions').upsert(
    {
      id: transactionId,
      receipt_number: transaction.receiptNumber,
      transaction_at: transaction.dateTime,
      cashier_name: transaction.cashierName || CASHIER_NAME,
      subtotal_before_discount: transaction.subtotalBeforeDiscount,
      discount_type: transaction.discountType,
      discount_value: transaction.discountValue,
      discount_amount: transaction.discountAmount,
      total_after_discount: transaction.totalAfterDiscount,
      payment_method: transaction.paymentMethod,
      paid_amount: transaction.paidAmount,
      change_amount: transaction.changeAmount,
    },
    { onConflict: 'id' },
  );

  throwIfError(transactionError, 'Gagal menyinkronkan transaksi.');

  const items = transaction.items.map((item, index) => ({
    id: stableUuid(
      'transaction-item',
      `${transaction.receiptNumber}:${item.id}:${index}`,
    ),
    transaction_id: transactionId,
    menu_item_id: null,
    menu_name_snapshot: item.nameSnapshot,
    category_name_snapshot: item.categorySnapshot,
    unit_price_snapshot: item.unitPriceSnapshot,
    hpp_snapshot: item.hppSnapshot ?? 0,
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('transaction_items')
      .upsert(items, { onConflict: 'id' });
    throwIfError(itemsError, 'Gagal menyinkronkan item transaksi.');
  }
}

async function upsertPendingOrder(order: PendingOrder) {
  if (!supabase) {
    return;
  }

  const pendingOrderId = stableUuid('pending-order', order.id);
  const { error: orderError } = await supabase.from('pending_orders').upsert(
    {
      id: pendingOrderId,
      label: order.label,
      cashier_name: CASHIER_NAME,
      created_at: order.createdAt,
    },
    { onConflict: 'id' },
  );

  throwIfError(orderError, 'Gagal menyinkronkan order tersimpan.');

  const items = order.items.map((item, index) => ({
    id: stableUuid('pending-order-item', `${order.id}:${item.id}:${index}`),
    pending_order_id: pendingOrderId,
    menu_item_id: null,
    menu_name_snapshot: item.nameSnapshot,
    category_name_snapshot: item.categorySnapshot,
    unit_price_snapshot: item.unitPriceSnapshot,
    hpp_snapshot: item.hppSnapshot ?? 0,
    quantity: item.quantity,
  }));

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('pending_order_items')
      .upsert(items, { onConflict: 'id' });
    throwIfError(itemsError, 'Gagal menyinkronkan item order tersimpan.');
  }
}

async function deletePendingOrder(pendingOrderId: string) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('pending_orders')
    .delete()
    .eq('id', stableUuid('pending-order', pendingOrderId));

  throwIfError(error, 'Gagal menghapus order tersimpan di cloud.');
}

async function upsertReceiptCounter(receiptCounter: number) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('app_settings').upsert(
    {
      key: 'receipt_counter',
      value: {
        receiptCounter,
      },
      description: 'Last Santara POS receipt counter synced from local app.',
    },
    { onConflict: 'key' },
  );

  throwIfError(error, 'Gagal menyinkronkan nomor struk.');
}

async function fetchMenuItems(): Promise<MenuItem[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category_name', { ascending: true })
    .order('name', { ascending: true });

  throwIfError(error, 'Gagal mengambil menu cloud.');

  return (data ?? []).map((row: DbRow) => ({
    id: toStringValue(row.id),
    name: toStringValue(row.name),
    category: toStringValue(row.category_name),
    price: toNumberValue(row.price),
    hpp: toNumberValue(row.hpp),
    isActive: Boolean(row.is_active),
  }));
}

async function fetchTransactions(): Promise<CompletedTransaction[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*, transaction_items(*)')
    .order('transaction_at', { ascending: true });

  throwIfError(error, 'Gagal mengambil transaksi cloud.');

  return (data ?? []).map((row: DbRow) => {
    const items = toArray(row.transaction_items).map(mapTransactionItem);

    return {
      receiptNumber: toStringValue(row.receipt_number),
      dateTime: toStringValue(row.transaction_at),
      cashierName: toStringValue(row.cashier_name) || CASHIER_NAME,
      items,
      subtotalBeforeDiscount: toNumberValue(row.subtotal_before_discount),
      discountType: toDiscountType(row.discount_type),
      discountValue: toNumberValue(row.discount_value),
      discountAmount: toNumberValue(row.discount_amount),
      totalAfterDiscount: toNumberValue(row.total_after_discount),
      paymentMethod: toPaymentMethod(row.payment_method),
      paidAmount: toNullableNumberValue(row.paid_amount),
      changeAmount: toNullableNumberValue(row.change_amount),
    };
  });
}

async function fetchPendingOrders(): Promise<PendingOrder[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('pending_orders')
    .select('*, pending_order_items(*)')
    .order('created_at', { ascending: false });

  throwIfError(error, 'Gagal mengambil order tersimpan cloud.');

  return (data ?? []).map((row: DbRow) => ({
    id: toStringValue(row.id),
    label: toStringValue(row.label),
    createdAt: toStringValue(row.created_at),
    items: toArray(row.pending_order_items).map((itemRow) => ({
      id: toStringValue(itemRow.menu_item_id || itemRow.id),
      nameSnapshot: toStringValue(itemRow.menu_name_snapshot),
      categorySnapshot: toStringValue(itemRow.category_name_snapshot),
      unitPriceSnapshot: toNumberValue(itemRow.unit_price_snapshot),
      hppSnapshot: toNumberValue(itemRow.hpp_snapshot),
      quantity: Math.max(1, toNumberValue(itemRow.quantity)),
    })),
  }));
}

async function fetchReceiptCounter() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'receipt_counter')
    .maybeSingle();

  throwIfError(error, 'Gagal mengambil nomor struk cloud.');

  if (!data || !isRecord(data.value)) {
    return null;
  }

  return toNumberValue(data.value.receiptCounter);
}

function mapTransactionItem(row: DbRow): TransactionItem {
  return {
    id: toStringValue(row.menu_item_id || row.id),
    nameSnapshot: toStringValue(row.menu_name_snapshot),
    categorySnapshot: toStringValue(row.category_name_snapshot),
    unitPriceSnapshot: toNumberValue(row.unit_price_snapshot),
    hppSnapshot: toNumberValue(row.hpp_snapshot),
    quantity: Math.max(1, toNumberValue(row.quantity)),
    subtotal: toNumberValue(row.subtotal),
  };
}

function mergeTransactions(
  localTransactions: CompletedTransaction[],
  cloudTransactions: CompletedTransaction[],
) {
  const transactionMap = new Map<string, CompletedTransaction>();

  localTransactions.forEach((transaction) => {
    transactionMap.set(transaction.receiptNumber, transaction);
  });
  cloudTransactions.forEach((transaction) => {
    transactionMap.set(transaction.receiptNumber, transaction);
  });

  return Array.from(transactionMap.values()).sort(
    (first, second) =>
      new Date(first.dateTime).getTime() - new Date(second.dateTime).getTime(),
  );
}

function getReceiptCounterFromTransactions(transactions: CompletedTransaction[]) {
  return transactions.reduce((maxCounter, transaction) => {
    const match = transaction.receiptNumber.match(/-(\d+)$/);
    const counter = match ? Number(match[1]) : 0;

    return Number.isFinite(counter) ? Math.max(maxCounter, counter) : maxCounter;
  }, 0);
}

function throwIfError(error: { message?: string } | null, fallbackMessage: string) {
  if (error) {
    throw new Error(error.message ?? fallbackMessage);
  }
}

function stableUuid(scope: string, value: string) {
  if (isUuid(value)) {
    return value.toLowerCase();
  }

  const input = `${scope}:${value}`;
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;

  for (let index = 0; index < input.length; index += 1) {
    const charCode = input.charCodeAt(index);
    hash1 = Math.imul(hash1 ^ charCode, 2654435761);
    hash2 = Math.imul(hash2 ^ charCode, 1597334677);
  }

  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507);
  hash1 ^= Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507);
  hash2 ^= Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);

  const hex = `${toHex(hash1)}${toHex(hash2)}${toHex(hash1 ^ hash2)}${toHex(
    hash1 + hash2,
  )}`.padEnd(32, '0');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(
    17,
    20,
  )}-${hex.slice(20, 32)}`;
}

function toHex(value: number) {
  return (value >>> 0).toString(16).padStart(8, '0');
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toStringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function toNumberValue(value: unknown) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

function toNullableNumberValue(value: unknown) {
  return value === null || value === undefined ? null : toNumberValue(value);
}

function toDiscountType(value: unknown): DiscountType {
  const text = toStringValue(value);

  return text === 'fixed' || text === 'percentage' ? text : 'none';
}

function toPaymentMethod(value: unknown): PaymentMethod {
  const text = toStringValue(value);

  return text === 'QRIS' || text === 'Debit' ? text : 'Cash';
}

function toArray(value: unknown): DbRow[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is DbRow {
  return typeof value === 'object' && value !== null;
}
