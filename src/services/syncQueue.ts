import type {
  CompletedTransaction,
  DailyClosing,
  Expense,
  GoogleSheetSyncLog,
  GoogleSheetSyncSettings,
  LegacyImportBatch,
  LegacySale,
  MenuCategory,
  MenuItem,
  PendingOrder,
} from '../types';
import type { BusinessIdentity } from '../config/businesses';

export type SyncOperationType =
  | 'menu-snapshot-upsert'
  | 'menu-category-delete'
  | 'transaction-upsert'
  | 'pending-order-upsert'
  | 'pending-order-delete'
  | 'app-settings-upsert'
  | 'legacy-import-upsert'
  | 'expense-upsert'
  | 'expense-delete'
  | 'daily-closing-upsert'
  | 'google-sheet-settings-upsert'
  | 'google-sheet-sync-log-upsert';

export type SyncOperation = {
  id: string;
  businessId: string;
  type: SyncOperationType;
  dedupeKey: string;
  createdAt: string;
  payload:
    | { menuItems: MenuItem[]; menuCategories?: MenuCategory[] }
    | { categoryId: string; categoryName: string }
    | { transaction: CompletedTransaction }
    | { pendingOrder: PendingOrder }
    | { pendingOrderId: string }
    | { receiptCounter: number }
    | { batch: LegacyImportBatch; sales: LegacySale[] }
    | { expense: Expense }
    | { expenseId: string }
    | { dailyClosing: DailyClosing }
    | { googleSheetSyncSettings: GoogleSheetSyncSettings }
    | { googleSheetSyncLog: GoogleSheetSyncLog };
};

export type NewSyncOperation = Omit<
  SyncOperation,
  'id' | 'createdAt' | 'businessId'
>;

export type SyncMeta = {
  lastSyncedAt: string | null;
  lastError: string | null;
};

const LEGACY_SYNC_QUEUE_KEY = 'santara-pos-sync-queue-v1';
const LEGACY_SYNC_META_KEY = 'santara-pos-sync-meta-v1';

export function loadSyncQueue(business: BusinessIdentity): SyncOperation[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const storageKey = getSyncQueueKey(business);
    let savedValue = window.localStorage.getItem(storageKey);

    if (!savedValue && business.slug === 'santara') {
      savedValue = migrateLegacyValue(LEGACY_SYNC_QUEUE_KEY, storageKey);
    }

    if (!savedValue) {
      return [];
    }

    const parsedValue = JSON.parse(savedValue);

    return Array.isArray(parsedValue)
      ? parsedValue
          .map((operation) => normalizeSyncOperation(operation, business.id))
          .filter((operation): operation is SyncOperation => Boolean(operation))
      : [];
  } catch {
    return [];
  }
}

export function saveSyncQueue(
  queue: SyncOperation[],
  business: BusinessIdentity,
) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(getSyncQueueKey(business), JSON.stringify(queue));
}

export function addSyncOperation(
  queue: SyncOperation[],
  operation: NewSyncOperation,
  businessId: string,
) {
  const nextOperation: SyncOperation = {
    ...operation,
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    businessId,
    createdAt: new Date().toISOString(),
  };
  const withoutDuplicate = queue.filter(
    (queuedOperation) => queuedOperation.dedupeKey !== operation.dedupeKey,
  );

  return [...withoutDuplicate, nextOperation];
}

export function removeSyncOperation(queue: SyncOperation[], operationId: string) {
  return queue.filter((operation) => operation.id !== operationId);
}

export function loadSyncMeta(business: BusinessIdentity): SyncMeta {
  if (!canUseLocalStorage()) {
    return {
      lastSyncedAt: null,
      lastError: null,
    };
  }

  try {
    const storageKey = getSyncMetaKey(business);
    let savedValue = window.localStorage.getItem(storageKey);

    if (!savedValue && business.slug === 'santara') {
      savedValue = migrateLegacyValue(LEGACY_SYNC_META_KEY, storageKey);
    }

    if (!savedValue) {
      return {
        lastSyncedAt: null,
        lastError: null,
      };
    }

    const parsedValue = JSON.parse(savedValue);

    if (!isRecord(parsedValue)) {
      return {
        lastSyncedAt: null,
        lastError: null,
      };
    }

    return {
      lastSyncedAt:
        typeof parsedValue.lastSyncedAt === 'string'
          ? parsedValue.lastSyncedAt
          : null,
      lastError:
        typeof parsedValue.lastError === 'string'
          ? parsedValue.lastError
          : null,
    };
  } catch {
    return {
      lastSyncedAt: null,
      lastError: null,
    };
  }
}

export function saveSyncMeta(meta: SyncMeta, business: BusinessIdentity) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(getSyncMetaKey(business), JSON.stringify(meta));
}

export function createMenuSyncOperation(
  menuItems: MenuItem[],
  menuCategories: MenuCategory[] = [],
): NewSyncOperation {
  return {
    type: 'menu-snapshot-upsert',
    dedupeKey: 'menu:snapshot',
    payload: {
      menuCategories,
      menuItems,
    },
  };
}

export function createMenuCategoryDeleteOperation(
  categoryId: string,
  categoryName: string,
): NewSyncOperation {
  return {
    type: 'menu-category-delete',
    dedupeKey: `menu-category-delete:${categoryId}:${categoryName}`,
    payload: {
      categoryId,
      categoryName,
    },
  };
}

export function createTransactionSyncOperations(
  transaction: CompletedTransaction,
  receiptCounter: number,
): NewSyncOperation[] {
  return [
    {
      type: 'transaction-upsert',
      dedupeKey: `transaction:${transaction.receiptNumber}`,
      payload: {
        transaction,
      },
    },
    {
      type: 'app-settings-upsert',
      dedupeKey: 'app-settings:receipt-counter',
      payload: {
        receiptCounter,
      },
    },
  ];
}

export function createPendingOrderUpsertOperation(
  pendingOrder: PendingOrder,
): NewSyncOperation {
  return {
    type: 'pending-order-upsert',
    dedupeKey: `pending-order:${pendingOrder.id}`,
    payload: {
      pendingOrder,
    },
  };
}

export function createPendingOrderDeleteOperation(
  pendingOrderId: string,
): NewSyncOperation {
  return {
    type: 'pending-order-delete',
    dedupeKey: `pending-order:${pendingOrderId}`,
    payload: {
      pendingOrderId,
    },
  };
}

export function createLegacyImportSyncOperation(
  batch: LegacyImportBatch,
  sales: LegacySale[],
): NewSyncOperation {
  return {
    type: 'legacy-import-upsert',
    dedupeKey: `legacy-import:${batch.id}`,
    payload: {
      batch,
      sales,
    },
  };
}

export function createExpenseUpsertOperation(
  expense: Expense,
): NewSyncOperation {
  return {
    type: 'expense-upsert',
    dedupeKey: `expense:${expense.id}`,
    payload: {
      expense,
    },
  };
}

export function createExpenseDeleteOperation(
  expenseId: string,
): NewSyncOperation {
  return {
    type: 'expense-delete',
    dedupeKey: `expense-delete:${expenseId}`,
    payload: {
      expenseId,
    },
  };
}

export function createDailyClosingSyncOperation(
  dailyClosing: DailyClosing,
): NewSyncOperation {
  return {
    type: 'daily-closing-upsert',
    dedupeKey: `daily-closing:${dailyClosing.closingDate}`,
    payload: {
      dailyClosing,
    },
  };
}

export function createGoogleSheetSettingsSyncOperation(
  googleSheetSyncSettings: GoogleSheetSyncSettings,
): NewSyncOperation {
  return {
    type: 'google-sheet-settings-upsert',
    dedupeKey: 'google-sheet:settings',
    payload: {
      googleSheetSyncSettings,
    },
  };
}

export function createGoogleSheetSyncLogOperation(
  googleSheetSyncLog: GoogleSheetSyncLog,
): NewSyncOperation {
  return {
    type: 'google-sheet-sync-log-upsert',
    dedupeKey: `google-sheet:log:${googleSheetSyncLog.id}`,
    payload: {
      googleSheetSyncLog,
    },
  };
}

function normalizeSyncOperation(
  value: unknown,
  businessId: string,
): SyncOperation | null {
  if (!(
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    typeof value.dedupeKey === 'string' &&
    typeof value.createdAt === 'string' &&
    isRecord(value.payload)
  )) {
    return null;
  }

  const operationBusinessId =
    typeof value.businessId === 'string' ? value.businessId : businessId;

  if (operationBusinessId !== businessId) {
    return null;
  }

  return {
    ...(value as Omit<SyncOperation, 'businessId'>),
    businessId,
  };
}

function getSyncQueueKey(business: BusinessIdentity) {
  return `cafe-pos:${business.slug}:sync-queue-v1`;
}

function getSyncMetaKey(business: BusinessIdentity) {
  return `cafe-pos:${business.slug}:sync-meta-v1`;
}

function migrateLegacyValue(legacyKey: string, scopedKey: string) {
  const legacyValue = window.localStorage.getItem(legacyKey);

  if (!legacyValue) {
    return null;
  }

  window.localStorage.setItem(scopedKey, legacyValue);
  window.localStorage.removeItem(legacyKey);

  return legacyValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
}
