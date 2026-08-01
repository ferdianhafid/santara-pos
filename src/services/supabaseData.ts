import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  SANTARA_BUSINESS,
  getBusinessById,
  getDefaultCashierName,
} from '../config/businesses';
import type {
  AppStateData,
  CompletedTransaction,
  DailyClosing,
  DiscountType,
  Expense,
  ExpensePaymentMethod,
  GoogleSheetSyncLog,
  GoogleSheetSyncSettings,
  LegacyImportBatch,
  LegacySale,
  MenuCategory,
  MenuItem,
  PaymentMethod,
  PendingOrder,
  TransactionItem,
} from '../types';
import type { SyncOperation } from './syncQueue';

type DbRow = Record<string, unknown>;

export function canUseSupabase() {
  return isSupabaseConfigured && Boolean(supabase);
}

export async function pushSyncOperation(operation: SyncOperation) {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const payload = operation.payload;
  const businessId = operation.businessId;

  if (operation.type === 'menu-snapshot-upsert' && 'menuItems' in payload) {
    await upsertMenuItems(businessId, payload.menuItems, payload.menuCategories ?? []);
    return;
  }

  if (
    operation.type === 'menu-category-delete' &&
    'categoryId' in payload &&
    'categoryName' in payload
  ) {
    await deleteMenuCategory(businessId, payload.categoryId, payload.categoryName);
    return;
  }

  if (operation.type === 'transaction-upsert' && 'transaction' in payload) {
    await upsertTransaction(businessId, payload.transaction);
    return;
  }

  if (operation.type === 'pending-order-upsert' && 'pendingOrder' in payload) {
    await upsertPendingOrder(businessId, payload.pendingOrder);
    return;
  }

  if (operation.type === 'pending-order-delete' && 'pendingOrderId' in payload) {
    await deletePendingOrder(businessId, payload.pendingOrderId);
    return;
  }

  if (operation.type === 'app-settings-upsert' && 'receiptCounter' in payload) {
    await upsertReceiptCounter(businessId, payload.receiptCounter);
    return;
  }

  if (operation.type === 'legacy-import-upsert' && 'batch' in payload) {
    await upsertLegacyImport(businessId, payload.batch, payload.sales);
    return;
  }

  if (operation.type === 'expense-upsert' && 'expense' in payload) {
    await upsertExpense(businessId, payload.expense);
    return;
  }

  if (operation.type === 'expense-delete' && 'expenseId' in payload) {
    await deleteExpense(businessId, payload.expenseId);
    return;
  }

  if (operation.type === 'daily-closing-upsert' && 'dailyClosing' in payload) {
    await upsertDailyClosing(businessId, payload.dailyClosing);
    return;
  }

  if (
    operation.type === 'google-sheet-settings-upsert' &&
    'googleSheetSyncSettings' in payload
  ) {
    await upsertGoogleSheetSettings(businessId, payload.googleSheetSyncSettings);
    return;
  }

  if (
    operation.type === 'google-sheet-sync-log-upsert' &&
    'googleSheetSyncLog' in payload
  ) {
    await upsertGoogleSheetSyncLog(businessId, payload.googleSheetSyncLog);
  }
}

export async function pullCloudAppState(
  currentData: AppStateData,
  businessId: string,
): Promise<AppStateData | null> {
  if (!supabase) {
    return null;
  }

  const [
    menuItems,
    menuCategories,
    completedTransactions,
    pendingOrders,
    receiptCounter,
    legacyData,
    expenses,
    dailyClosings,
    googleSheetSyncSettings,
    googleSheetSyncLogs,
  ] =
    await Promise.all([
      fetchMenuItems(businessId),
      fetchMenuCategories(businessId),
      fetchTransactions(businessId),
      fetchPendingOrders(businessId),
      fetchReceiptCounter(businessId),
      fetchLegacyImports(businessId),
      fetchExpenses(businessId),
      fetchDailyClosings(businessId),
      fetchGoogleSheetSettings(businessId),
      fetchGoogleSheetSyncLogs(businessId),
    ]);

  const hasCloudData =
    menuItems.length > 0 ||
    menuCategories.length > 0 ||
    completedTransactions.length > 0 ||
    pendingOrders.length > 0 ||
    legacyData.sales.length > 0 ||
    legacyData.batches.length > 0 ||
    expenses.length > 0 ||
    dailyClosings.length > 0 ||
    googleSheetSyncSettings !== null ||
    googleSheetSyncLogs.length > 0 ||
    receiptCounter !== null;

  if (!hasCloudData) {
    return null;
  }

  return {
    menuCategories:
      menuCategories.length > 0 ? menuCategories : currentData.menuCategories,
    menuItems: menuItems.length > 0 ? menuItems : currentData.menuItems,
    pendingOrders:
      pendingOrders.length > 0 || currentData.pendingOrders.length === 0
        ? pendingOrders
        : currentData.pendingOrders,
    completedTransactions:
      completedTransactions.length > 0
        ? mergeTransactions(currentData.completedTransactions, completedTransactions)
        : currentData.completedTransactions,
    legacySales:
      legacyData.sales.length > 0
        ? mergeLegacySales(currentData.legacySales, legacyData.sales)
        : currentData.legacySales,
    legacyImportBatches:
      legacyData.batches.length > 0
        ? mergeLegacyBatches(currentData.legacyImportBatches, legacyData.batches)
        : currentData.legacyImportBatches,
    expenses:
      expenses.length > 0
        ? mergeExpenses(currentData.expenses, expenses)
        : currentData.expenses,
    dailyClosings:
      dailyClosings.length > 0
        ? mergeDailyClosings(currentData.dailyClosings, dailyClosings)
        : currentData.dailyClosings,
    googleSheetSyncSettings:
      googleSheetSyncSettings ?? currentData.googleSheetSyncSettings,
    googleSheetSyncLogs:
      googleSheetSyncLogs.length > 0
        ? mergeGoogleSheetSyncLogs(
            currentData.googleSheetSyncLogs,
            googleSheetSyncLogs,
          )
        : currentData.googleSheetSyncLogs,
    receiptCounter: Math.max(
      currentData.receiptCounter,
      receiptCounter ?? 0,
      getReceiptCounterFromTransactions(completedTransactions),
    ),
  };
}

async function upsertMenuItems(
  businessId: string,
  menuItems: MenuItem[],
  menuCategories: MenuCategory[],
) {
  if (!supabase || (menuItems.length === 0 && menuCategories.length === 0)) {
    return;
  }

  const categoryNames = Array.from(
    new Set([
      ...menuCategories.map((category) => category.name),
      ...menuItems.map((item) => item.category),
    ].filter(Boolean)),
  );
  const categoryByName = new Map(
    menuCategories.map((category) => [category.name, category]),
  );
  const categories = categoryNames.map((name, index) => {
    const category = categoryByName.get(name);

    return {
      id: stableUuid(businessScope(businessId, 'category'), category?.id ?? name),
      business_id: businessId,
      name,
      sort_order: index,
      is_active: category?.isActive ?? true,
    };
  });

  if (categories.length > 0) {
    const { error } = await supabase
      .from('menu_categories')
      .upsert(categories, { onConflict: 'id' });
    throwIfError(error, 'Gagal menyinkronkan kategori menu.');
  }

  const rows = menuItems.map((item) => ({
    id: stableUuid(businessScope(businessId, 'menu'), item.id),
    business_id: businessId,
    category_id: stableUuid(
      businessScope(businessId, 'category'),
      categoryByName.get(item.category)?.id ?? item.category,
    ),
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

async function deleteMenuCategory(
  businessId: string,
  categoryId: string,
  categoryName: string,
) {
  if (!supabase) {
    return;
  }

  if (categoryName) {
    const { error: itemsByNameError } = await supabase
      .from('menu_items')
      .delete()
      .eq('business_id', businessId)
      .eq('category_name', categoryName);
    throwIfError(itemsByNameError, 'Gagal menghapus menu kategori cloud.');
  }

  const categoryIds = Array.from(
    new Set([
      categoryId,
      stableUuid(businessScope(businessId, 'category'), categoryId),
      stableUuid(businessScope(businessId, 'category'), categoryName),
    ]),
  ).filter(isUuid);

  if (categoryIds.length > 0) {
    const { error: categoryIdError } = await supabase
      .from('menu_categories')
      .delete()
      .eq('business_id', businessId)
      .in('id', categoryIds);
    throwIfError(categoryIdError, 'Gagal menghapus kategori menu cloud.');
  }

  if (categoryName) {
    const { error: categoryNameError } = await supabase
      .from('menu_categories')
      .delete()
      .eq('business_id', businessId)
      .eq('name', categoryName);
    throwIfError(categoryNameError, 'Gagal menghapus kategori menu cloud.');
  }
}

async function upsertTransaction(
  businessId: string,
  transaction: CompletedTransaction,
) {
  if (!supabase) {
    return;
  }

  const transactionId = stableUuid(
    businessScope(businessId, 'transaction'),
    transaction.receiptNumber,
  );
  const { error: transactionError } = await supabase.from('transactions').upsert(
    {
      id: transactionId,
      business_id: businessId,
      receipt_number: transaction.receiptNumber,
      transaction_at: transaction.dateTime,
      cashier_name: transaction.cashierName || getBusinessCashierName(businessId),
      subtotal_before_discount: transaction.subtotalBeforeDiscount,
      discount_type: transaction.discountType,
      discount_value: transaction.discountValue,
      discount_amount: transaction.discountAmount,
      item_discount_amount: transaction.itemDiscountAmount ?? 0,
      transaction_discount_amount: transaction.transactionDiscountAmount ?? 0,
      total_after_discount: transaction.totalAfterDiscount,
      payment_method: transaction.paymentMethod,
      paid_amount: transaction.paidAmount,
      change_amount: transaction.changeAmount,
      status: transaction.status ?? 'completed',
      voided_at: transaction.voidedAt ?? null,
      voided_by_name: transaction.voidedBy ?? null,
      void_reason: transaction.voidReason ?? null,
    },
    { onConflict: 'id' },
  );

  throwIfError(transactionError, 'Gagal menyinkronkan transaksi.');

  const items = transaction.items.map((item, index) => ({
    id: stableUuid(
      businessScope(businessId, 'transaction-item'),
      `${transaction.receiptNumber}:${item.id}:${index}`,
    ),
    transaction_id: transactionId,
    business_id: businessId,
    menu_item_id: null,
    menu_name_snapshot: item.nameSnapshot,
    category_name_snapshot: item.categorySnapshot,
    unit_price_snapshot: item.unitPriceSnapshot,
    hpp_snapshot: item.hppSnapshot ?? 0,
    quantity: item.quantity,
    subtotal: item.subtotal,
    gross_line_total: item.grossLineTotal ?? item.subtotal,
    item_discount_type: item.itemDiscountType ?? 'none',
    item_discount_value: item.itemDiscountValue ?? 0,
    item_discount_amount: item.itemDiscountAmount ?? 0,
    line_net_total:
      item.lineNetTotal ??
      Math.max(item.subtotal - (item.itemDiscountAmount ?? 0), 0),
    unit_hpp_snapshot: item.unitHppSnapshot ?? item.hppSnapshot ?? 0,
    total_hpp:
      item.totalHpp ?? (item.hppSnapshot ?? 0) * Math.max(1, item.quantity),
    profit:
      item.profit ??
      Math.max(item.subtotal - (item.itemDiscountAmount ?? 0), 0) -
        (item.hppSnapshot ?? 0) * Math.max(1, item.quantity),
  }));

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('transaction_items')
      .upsert(items, { onConflict: 'id' });
    throwIfError(itemsError, 'Gagal menyinkronkan item transaksi.');
  }
}

async function upsertPendingOrder(businessId: string, order: PendingOrder) {
  if (!supabase) {
    return;
  }

  const pendingOrderId = stableUuid(
    businessScope(businessId, 'pending-order'),
    order.id,
  );
  const { error: orderError } = await supabase.from('pending_orders').upsert(
    {
      id: pendingOrderId,
      business_id: businessId,
      label: order.label,
      cashier_name: getBusinessCashierName(businessId),
      created_at: order.createdAt,
    },
    { onConflict: 'id' },
  );

  throwIfError(orderError, 'Gagal menyinkronkan order tersimpan.');

  const items = order.items.map((item, index) => ({
    id: stableUuid(
      businessScope(businessId, 'pending-order-item'),
      `${order.id}:${item.id}:${index}`,
    ),
    pending_order_id: pendingOrderId,
    business_id: businessId,
    menu_item_id: null,
    menu_name_snapshot: item.nameSnapshot,
    category_name_snapshot: item.categorySnapshot,
    unit_price_snapshot: item.unitPriceSnapshot,
    hpp_snapshot: item.hppSnapshot ?? 0,
    quantity: item.quantity,
    item_discount_type: item.itemDiscountType ?? 'none',
    item_discount_value: item.itemDiscountValue ?? 0,
    item_discount_amount: item.itemDiscountAmount ?? 0,
  }));

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('pending_order_items')
      .upsert(items, { onConflict: 'id' });
    throwIfError(itemsError, 'Gagal menyinkronkan item order tersimpan.');
  }
}

async function deletePendingOrder(businessId: string, pendingOrderId: string) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('pending_orders')
    .delete()
    .eq('business_id', businessId)
    .eq(
      'id',
      stableUuid(businessScope(businessId, 'pending-order'), pendingOrderId),
    );

  throwIfError(error, 'Gagal menghapus order tersimpan di cloud.');
}

async function upsertReceiptCounter(businessId: string, receiptCounter: number) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('app_settings').upsert(
    {
      business_id: businessId,
      key: 'receipt_counter',
      value: {
        receiptCounter,
      },
      description: 'Last business-scoped POS receipt counter synced from local app.',
    },
    { onConflict: 'business_id,key' },
  );

  throwIfError(error, 'Gagal menyinkronkan nomor struk.');
}

async function upsertLegacyImport(
  businessId: string,
  batch: LegacyImportBatch,
  sales: LegacySale[],
) {
  if (!supabase) {
    return;
  }

  const batchId = stableUuid(
    businessScope(businessId, 'legacy-import-batch'),
    batch.id,
  );
  const { error: batchError } = await supabase
    .from('legacy_import_batches')
    .upsert(
      {
        id: batchId,
        business_id: businessId,
        local_id: batch.id,
        file_name: batch.fileName,
        imported_at: batch.importedAt,
        imported_by_name: batch.importedBy,
        total_rows: batch.totalRows,
        date_start: batch.dateStart || null,
        date_end: batch.dateEnd || null,
        total_gross_sales: batch.totalGrossSales,
        total_discount: batch.totalDiscount,
        total_net_sales: batch.totalNetSales,
        total_hpp: batch.totalHpp,
      },
      { onConflict: 'id' },
    );

  throwIfError(batchError, 'Gagal menyinkronkan batch import lama.');

  const rows = sales.map((sale) => ({
    id: stableUuid(businessScope(businessId, 'legacy-sale'), sale.id),
    business_id: businessId,
    local_id: sale.id,
    import_batch_id: batchId,
    sale_date: sale.saleDate,
    menu_name: sale.menuName,
    category_name: sale.category,
    quantity: sale.quantity,
    gross_sales: sale.grossSales,
    discount_amount: sale.discountAmount,
    net_sales: sale.netSales,
    hpp_total: sale.hppTotal,
    payment_method: sale.paymentMethod || 'Legacy',
    notes: sale.notes,
    source: 'legacy_import',
    imported_by_name: sale.importedBy,
    imported_at: sale.importedAt,
  }));

  if (rows.length > 0) {
    const { error: salesError } = await supabase
      .from('legacy_sales')
      .upsert(rows, { onConflict: 'id' });
    throwIfError(salesError, 'Gagal menyinkronkan data import lama.');
  }
}

async function upsertExpense(businessId: string, expense: Expense) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('expenses').upsert(
    {
      id: stableUuid(businessScope(businessId, 'expense'), expense.id),
      business_id: businessId,
      local_id: expense.id,
      expense_date: expense.date,
      name: expense.name,
      category: expense.category,
      amount: expense.amount,
      payment_method: expense.paymentMethod,
      notes: expense.notes,
      created_by_name: expense.createdBy,
      created_at: expense.createdAt,
      updated_at: expense.updatedAt,
    },
    { onConflict: 'id' },
  );

  throwIfError(error, 'Gagal menyinkronkan pengeluaran.');
}

async function deleteExpense(businessId: string, expenseId: string) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('business_id', businessId)
    .eq('id', stableUuid(businessScope(businessId, 'expense'), expenseId));

  throwIfError(error, 'Gagal menghapus pengeluaran di cloud.');
}

async function upsertDailyClosing(
  businessId: string,
  dailyClosing: DailyClosing,
) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('daily_closings').upsert(
    {
      id: stableUuid(businessScope(businessId, 'daily-closing'), dailyClosing.id),
      business_id: businessId,
      local_id: dailyClosing.id,
      closing_date: dailyClosing.closingDate,
      cashier_name: dailyClosing.cashierName,
      gross_sales: dailyClosing.grossSales,
      total_discount: dailyClosing.totalDiscount,
      net_sales: dailyClosing.netSales,
      total_hpp: dailyClosing.totalHpp,
      gross_profit: dailyClosing.grossProfit,
      total_expenses: dailyClosing.totalExpenses,
      net_profit: dailyClosing.netProfit,
      cash_sales: dailyClosing.cashSales,
      qris_sales: dailyClosing.qrisSales,
      debit_sales: dailyClosing.debitSales,
      expected_cash: dailyClosing.expectedCash,
      actual_cash: dailyClosing.actualCash,
      cash_difference: dailyClosing.cashDifference,
      notes: dailyClosing.notes,
      created_by_name: dailyClosing.createdBy,
      created_at: dailyClosing.createdAt,
      updated_at: dailyClosing.updatedAt,
    },
    { onConflict: 'id' },
  );

  throwIfError(error, 'Gagal menyinkronkan closing harian.');
}

async function upsertGoogleSheetSettings(
  businessId: string,
  settings: GoogleSheetSyncSettings,
) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('google_sheet_sync_settings').upsert(
    {
      id: stableUuid(businessScope(businessId, 'google-sheet-settings'), 'default'),
      business_id: businessId,
      endpoint_url: settings.endpointUrl,
      is_enabled: settings.isEnabled,
      updated_by_name: settings.updatedBy,
      updated_at: settings.updatedAt ?? new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  throwIfError(error, 'Gagal menyinkronkan pengaturan Google Sheet.');
}

async function upsertGoogleSheetSyncLog(
  businessId: string,
  log: GoogleSheetSyncLog,
) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('google_sheet_sync_logs').upsert(
    {
      id: stableUuid(businessScope(businessId, 'google-sheet-sync-log'), log.id),
      business_id: businessId,
      local_id: log.id,
      report_mode: log.reportMode,
      selected_date: log.selectedDate,
      status: log.status,
      message: log.message,
      synced_at: log.syncedAt,
      synced_by_name: log.syncedBy,
    },
    { onConflict: 'id' },
  );

  throwIfError(error, 'Gagal menyinkronkan log Google Sheet.');
}

async function fetchMenuItems(businessId: string): Promise<MenuItem[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('business_id', businessId)
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

async function fetchMenuCategories(businessId: string): Promise<MenuCategory[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  throwIfError(error, 'Gagal mengambil kategori menu cloud.');

  return (data ?? []).map((row: DbRow) => ({
    id: toStringValue(row.id),
    name: toStringValue(row.name),
    isActive: row.is_active !== false,
    createdAt: toStringValue(row.created_at),
    updatedAt: toStringValue(row.updated_at),
    items: [],
  }));
}

async function fetchTransactions(
  businessId: string,
): Promise<CompletedTransaction[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*, transaction_items(*)')
    .eq('business_id', businessId)
    .order('transaction_at', { ascending: true });

  throwIfError(error, 'Gagal mengambil transaksi cloud.');

  return (data ?? []).map((row: DbRow) => {
    const items = toArray(row.transaction_items).map(mapTransactionItem);

    return {
      receiptNumber: toStringValue(row.receipt_number),
      dateTime: toStringValue(row.transaction_at),
      cashierName:
        toStringValue(row.cashier_name) || getBusinessCashierName(businessId),
      items,
      subtotalBeforeDiscount: toNumberValue(row.subtotal_before_discount),
      discountType: toDiscountType(row.discount_type),
      discountValue: toNumberValue(row.discount_value),
      discountAmount: toNumberValue(row.discount_amount),
      itemDiscountAmount: toNumberValue(row.item_discount_amount),
      transactionDiscountAmount: toNumberValue(row.transaction_discount_amount),
      totalAfterDiscount: toNumberValue(row.total_after_discount),
      paymentMethod: toPaymentMethod(row.payment_method),
      paidAmount: toNullableNumberValue(row.paid_amount),
      changeAmount: toNullableNumberValue(row.change_amount),
      status: toStringValue(row.status) === 'voided' ? 'voided' : 'completed',
      voidedAt: toStringValue(row.voided_at) || null,
      voidedBy: toStringValue(row.voided_by_name) || null,
      voidReason: toStringValue(row.void_reason) || null,
    };
  });
}

async function fetchPendingOrders(businessId: string): Promise<PendingOrder[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('pending_orders')
    .select('*, pending_order_items(*)')
    .eq('business_id', businessId)
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
      itemDiscountType: toDiscountType(itemRow.item_discount_type),
      itemDiscountValue: toNumberValue(itemRow.item_discount_value),
      itemDiscountAmount: toNumberValue(itemRow.item_discount_amount),
    })),
  }));
}

async function fetchReceiptCounter(businessId: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('business_id', businessId)
    .eq('key', 'receipt_counter')
    .maybeSingle();

  throwIfError(error, 'Gagal mengambil nomor struk cloud.');

  if (!data || !isRecord(data.value)) {
    return null;
  }

  return toNumberValue(data.value.receiptCounter);
}

async function fetchLegacyImports(businessId: string): Promise<{
  batches: LegacyImportBatch[];
  sales: LegacySale[];
}> {
  if (!supabase) {
    return { batches: [], sales: [] };
  }

  const [{ data: batchData, error: batchError }, { data: salesData, error: salesError }] =
    await Promise.all([
      supabase
        .from('legacy_import_batches')
        .select('*')
        .eq('business_id', businessId)
        .order('imported_at', { ascending: false }),
      supabase
        .from('legacy_sales')
        .select('*')
        .eq('business_id', businessId)
        .order('sale_date', { ascending: true }),
    ]);

  throwIfError(batchError, 'Gagal mengambil riwayat import lama.');
  throwIfError(salesError, 'Gagal mengambil data import lama.');

  return {
    batches: (batchData ?? []).map((row: DbRow) => ({
      id: toStringValue(row.local_id) || toStringValue(row.id),
      fileName: toStringValue(row.file_name),
      importedAt: toStringValue(row.imported_at),
      importedBy: toStringValue(row.imported_by_name) || 'Cafe User',
      totalRows: toNumberValue(row.total_rows),
      dateStart: toStringValue(row.date_start),
      dateEnd: toStringValue(row.date_end),
      totalGrossSales: toNumberValue(row.total_gross_sales),
      totalDiscount: toNumberValue(row.total_discount),
      totalNetSales: toNumberValue(row.total_net_sales),
      totalHpp: toNumberValue(row.total_hpp),
    })),
    sales: (salesData ?? []).map((row: DbRow) => ({
      id: toStringValue(row.local_id) || toStringValue(row.id),
      batchId: toStringValue(row.import_batch_id),
      saleDate: toStringValue(row.sale_date),
      menuName: toStringValue(row.menu_name),
      category: toStringValue(row.category_name) || 'Legacy',
      quantity: Math.max(1, toNumberValue(row.quantity)),
      grossSales: toNumberValue(row.gross_sales),
      discountAmount: toNumberValue(row.discount_amount),
      netSales: toNumberValue(row.net_sales),
      hppTotal: toNumberValue(row.hpp_total),
      paymentMethod: toStringValue(row.payment_method) || 'Legacy',
      notes: toStringValue(row.notes),
      source: 'legacy_import',
      importedAt: toStringValue(row.imported_at),
      importedBy: toStringValue(row.imported_by_name) || 'Cafe User',
    })),
  };
}

async function fetchExpenses(businessId: string): Promise<Expense[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('business_id', businessId)
    .order('expense_date', { ascending: false });

  throwIfError(error, 'Gagal mengambil pengeluaran cloud.');

  return (data ?? []).map((row: DbRow) => ({
    id: toStringValue(row.local_id) || toStringValue(row.id),
    date: toStringValue(row.expense_date),
    name: toStringValue(row.name),
    category: toStringValue(row.category),
    amount: toNumberValue(row.amount),
    paymentMethod: toExpensePaymentMethod(row.payment_method),
    notes: toStringValue(row.notes),
    createdAt: toStringValue(row.created_at),
    updatedAt: toStringValue(row.updated_at),
    createdBy: toStringValue(row.created_by_name) || 'Cafe User',
  }));
}

async function fetchDailyClosings(businessId: string): Promise<DailyClosing[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('business_id', businessId)
    .order('closing_date', { ascending: false });

  throwIfError(error, 'Gagal mengambil closing harian cloud.');

  return (data ?? []).map((row: DbRow) => ({
    id: toStringValue(row.local_id) || toStringValue(row.id),
    closingDate: toStringValue(row.closing_date),
    cashierName: toStringValue(row.cashier_name),
    grossSales: toNumberValue(row.gross_sales),
    totalDiscount: toNumberValue(row.total_discount),
    netSales: toNumberValue(row.net_sales),
    totalHpp: toNumberValue(row.total_hpp),
    grossProfit: toSignedNumberValue(row.gross_profit),
    totalExpenses: toNumberValue(row.total_expenses),
    netProfit: toSignedNumberValue(row.net_profit),
    cashSales: toNumberValue(row.cash_sales),
    qrisSales: toNumberValue(row.qris_sales),
    debitSales: toNumberValue(row.debit_sales),
    expectedCash: toSignedNumberValue(row.expected_cash),
    actualCash: toSignedNumberValue(row.actual_cash),
    cashDifference: toSignedNumberValue(row.cash_difference),
    notes: toStringValue(row.notes),
    createdAt: toStringValue(row.created_at),
    updatedAt: toStringValue(row.updated_at),
    createdBy: toStringValue(row.created_by_name) || 'Cafe User',
  }));
}

async function fetchGoogleSheetSettings(
  businessId: string,
): Promise<GoogleSheetSyncSettings | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('google_sheet_sync_settings')
    .select('*')
    .eq('business_id', businessId)
    .limit(1)
    .maybeSingle();

  throwIfError(error, 'Gagal mengambil pengaturan Google Sheet cloud.');

  if (!data) {
    return null;
  }

  return {
    endpointUrl: toStringValue(data.endpoint_url),
    isEnabled: Boolean(data.is_enabled),
    updatedAt: toStringValue(data.updated_at) || null,
    updatedBy: toStringValue(data.updated_by_name) || 'Cafe User',
  };
}

async function fetchGoogleSheetSyncLogs(
  businessId: string,
): Promise<GoogleSheetSyncLog[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('google_sheet_sync_logs')
    .select('*')
    .eq('business_id', businessId)
    .order('synced_at', { ascending: false })
    .limit(20);

  throwIfError(error, 'Gagal mengambil log Google Sheet cloud.');

  return (data ?? []).map((row: DbRow) => ({
    id: toStringValue(row.local_id) || toStringValue(row.id),
    reportMode: toStringValue(row.report_mode),
    selectedDate: toStringValue(row.selected_date) || null,
    status: toStringValue(row.status) === 'success' ? 'success' : 'error',
    message: toStringValue(row.message),
    syncedAt: toStringValue(row.synced_at),
    syncedBy: toStringValue(row.synced_by_name) || 'Cafe User',
  }));
}

function mapTransactionItem(row: DbRow): TransactionItem {
  const subtotal = toNumberValue(row.subtotal);
  const itemDiscountAmount = toNumberValue(row.item_discount_amount);
  const lineNetTotal = toNumberValue(row.line_net_total) || Math.max(subtotal - itemDiscountAmount, 0);
  const hppSnapshot = toNumberValue(row.hpp_snapshot);
  const quantity = Math.max(1, toNumberValue(row.quantity));

  return {
    id: toStringValue(row.menu_item_id || row.id),
    nameSnapshot: toStringValue(row.menu_name_snapshot),
    categorySnapshot: toStringValue(row.category_name_snapshot),
    unitPriceSnapshot: toNumberValue(row.unit_price_snapshot),
    hppSnapshot,
    quantity,
    itemDiscountType: toDiscountType(row.item_discount_type),
    itemDiscountValue: toNumberValue(row.item_discount_value),
    itemDiscountAmount,
    subtotal,
    grossLineTotal: toNumberValue(row.gross_line_total) || subtotal,
    lineNetTotal,
    unitHppSnapshot: toNumberValue(row.unit_hpp_snapshot) || hppSnapshot,
    totalHpp: toNumberValue(row.total_hpp) || hppSnapshot * quantity,
    profit:
      toSignedNumberValue(row.profit) ||
      lineNetTotal - hppSnapshot * quantity,
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

function mergeLegacySales(localSales: LegacySale[], cloudSales: LegacySale[]) {
  const salesMap = new Map<string, LegacySale>();

  localSales.forEach((sale) => salesMap.set(sale.id, sale));
  cloudSales.forEach((sale) => salesMap.set(sale.id, sale));

  return Array.from(salesMap.values()).sort(
    (first, second) =>
      new Date(first.saleDate).getTime() - new Date(second.saleDate).getTime(),
  );
}

function mergeLegacyBatches(
  localBatches: LegacyImportBatch[],
  cloudBatches: LegacyImportBatch[],
) {
  const batchMap = new Map<string, LegacyImportBatch>();

  localBatches.forEach((batch) => batchMap.set(batch.id, batch));
  cloudBatches.forEach((batch) => batchMap.set(batch.id, batch));

  return Array.from(batchMap.values()).sort(
    (first, second) =>
      new Date(second.importedAt).getTime() - new Date(first.importedAt).getTime(),
  );
}

function mergeExpenses(localExpenses: Expense[], cloudExpenses: Expense[]) {
  const expenseMap = new Map<string, Expense>();

  localExpenses.forEach((expense) => expenseMap.set(expense.id, expense));
  cloudExpenses.forEach((expense) => expenseMap.set(expense.id, expense));

  return Array.from(expenseMap.values()).sort(
    (first, second) =>
      new Date(second.date).getTime() - new Date(first.date).getTime(),
  );
}

function mergeDailyClosings(
  localClosings: DailyClosing[],
  cloudClosings: DailyClosing[],
) {
  const closingMap = new Map<string, DailyClosing>();

  localClosings.forEach((closing) => closingMap.set(closing.id, closing));
  cloudClosings.forEach((closing) => closingMap.set(closing.id, closing));

  return Array.from(closingMap.values()).sort(
    (first, second) =>
      new Date(second.closingDate).getTime() -
      new Date(first.closingDate).getTime(),
  );
}

function mergeGoogleSheetSyncLogs(
  localLogs: GoogleSheetSyncLog[],
  cloudLogs: GoogleSheetSyncLog[],
) {
  const logMap = new Map<string, GoogleSheetSyncLog>();

  localLogs.forEach((log) => logMap.set(log.id, log));
  cloudLogs.forEach((log) => logMap.set(log.id, log));

  return Array.from(logMap.values())
    .sort(
      (first, second) =>
        new Date(second.syncedAt).getTime() - new Date(first.syncedAt).getTime(),
    )
    .slice(0, 30);
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

function getBusinessCashierName(businessId: string) {
  const business = getBusinessById(businessId);

  return business ? getDefaultCashierName(business) : 'Cafe Cashier';
}

function businessScope(businessId: string, scope: string) {
  return businessId === SANTARA_BUSINESS.id
    ? scope
    : `${businessId}:${scope}`;
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

function toSignedNumberValue(value: unknown) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
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

function toExpensePaymentMethod(value: unknown): ExpensePaymentMethod {
  const text = toStringValue(value);

  if (
    text === 'QRIS' ||
    text === 'Debit' ||
    text === 'Transfer' ||
    text === 'Other'
  ) {
    return text;
  }

  return 'Cash';
}

function toArray(value: unknown): DbRow[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is DbRow {
  return typeof value === 'object' && value !== null;
}
