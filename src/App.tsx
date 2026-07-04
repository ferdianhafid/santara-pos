import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckoutModal } from './components/CheckoutModal';
import { Expenses } from './components/Expenses';
import { ConfirmOrderModal, SaveOrderModal } from './components/HoldOrderModals';
import { ItemDiscountModal } from './components/ItemDiscountModal';
import { LoginScreen } from './components/LoginScreen';
import { MenuAdmin } from './components/MenuAdmin';
import { ReceiptHistory } from './components/ReceiptHistory';
import { ReceiptPreview } from './components/ReceiptPreview';
import { Reports } from './components/Reports';
import { menuCategories as initialMenuCategories } from './data/menu';
import {
  fetchUserProfile,
  getCurrentSession,
  onSupabaseAuthChange,
  signInToSupabase,
  signOutFromSupabase,
  type UserProfile,
  type UserRole,
} from './services/supabaseAuth';
import {
  canUseSupabase,
  pullCloudAppState,
  pushSyncOperation,
} from './services/supabaseData';
import {
  addSyncOperation,
  createDailyClosingSyncOperation,
  createExpenseDeleteOperation,
  createExpenseUpsertOperation,
  createGoogleSheetSettingsSyncOperation,
  createGoogleSheetSyncLogOperation,
  createLegacyImportSyncOperation,
  createMenuSyncOperation,
  createPendingOrderDeleteOperation,
  createPendingOrderUpsertOperation,
  createTransactionSyncOperations,
  loadSyncMeta,
  loadSyncQueue,
  removeSyncOperation,
  saveSyncMeta,
  saveSyncQueue,
  type SyncMeta,
  type SyncOperation,
} from './services/syncQueue';
import type {
  AppStateData,
  CartItem,
  CompletedTransaction,
  DailyClosing,
  DiscountType,
  Expense,
  GoogleSheetSyncLog,
  GoogleSheetSyncSettings,
  LegacyImportBatch,
  LegacySale,
  MenuCategory,
  MenuItem,
  PendingOrder,
} from './types';
import {
  formatCompactDate,
  formatRupiah,
  formatShortTime,
} from './utils/format';
import {
  createDefaultAppState,
  loadAppState,
  saveAppState,
} from './utils/storage';

const CASHIER_NAME = 'Santara Cashier';
const defaultMenuItems = initialMenuCategories.flatMap((category) => category.items);

type AppTab =
  | 'cashier'
  | 'menu'
  | 'receipts'
  | 'reports'
  | 'expenses';
type AuthStatus = 'loading' | 'local' | 'authenticated' | 'unauthenticated';

type PendingOrderAction = {
  type: 'resume' | 'delete';
  order: PendingOrder;
};

type SyncStatus =
  | 'local'
  | 'synced'
  | 'syncing'
  | 'pending'
  | 'error'
  | 'login-required';

const appTabs: Array<{ id: AppTab; label: string; icon: string }> = [
  { id: 'cashier', label: 'Kasir', icon: '🛒' },
  { id: 'menu', label: 'Menu', icon: '📋' },
  { id: 'receipts', label: 'Struk', icon: '🧾' },
  { id: 'reports', label: 'Laporan', icon: '📊' },
  { id: 'expenses', label: 'Pengeluaran', icon: '💰' },
];

function createReceiptNumber(date: Date, sequence: number) {
  return `SAN-${formatCompactDate(date)}-${String(sequence).padStart(3, '0')}`;
}

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('cashier');
  const [initialAppData] = useState(() => loadAppState(defaultMenuItems));
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>(
    initialAppData.menuCategories,
  );
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialAppData.menuItems);
  const [activeCategoryName, setActiveCategoryName] = useState(
    initialAppData.menuItems[0]?.category ?? initialMenuCategories[0].name,
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedTransactions, setCompletedTransactions] = useState<
    CompletedTransaction[]
  >(initialAppData.completedTransactions);
  const [legacySales, setLegacySales] = useState<LegacySale[]>(
    initialAppData.legacySales,
  );
  const [legacyImportBatches, setLegacyImportBatches] = useState<
    LegacyImportBatch[]
  >(initialAppData.legacyImportBatches);
  const [expenses, setExpenses] = useState<Expense[]>(initialAppData.expenses);
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>(
    initialAppData.dailyClosings,
  );
  const [googleSheetSyncSettings, setGoogleSheetSyncSettings] =
    useState<GoogleSheetSyncSettings>(initialAppData.googleSheetSyncSettings);
  const [googleSheetSyncLogs, setGoogleSheetSyncLogs] = useState<
    GoogleSheetSyncLog[]
  >(initialAppData.googleSheetSyncLogs);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>(
    initialAppData.pendingOrders,
  );
  const [receiptCounter, setReceiptCounter] = useState(initialAppData.receiptCounter);
  const [isSaveOrderOpen, setIsSaveOrderOpen] = useState(false);
  const [discountItemId, setDiscountItemId] = useState<string | null>(null);
  const [pendingOrderAction, setPendingOrderAction] =
    useState<PendingOrderAction | null>(null);
  const [syncQueue, setSyncQueue] = useState<SyncOperation[]>(loadSyncQueue);
  const [syncMeta, setSyncMeta] = useState<SyncMeta>(loadSyncMeta);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    canUseSupabase() ? 'login-required' : 'local',
  );
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    canUseSupabase() ? 'loading' : 'local',
  );
  const [authProfile, setAuthProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const isSyncingRef = useRef(false);

  const latestTransaction = completedTransactions[completedTransactions.length - 1];
  const effectiveRole: UserRole =
    authStatus === 'local' ? 'owner' : authProfile?.role ?? 'cashier';
  const visibleTabs = useMemo(
    () => appTabs.filter((tab) => canAccessTab(tab.id, effectiveRole)),
    [effectiveRole],
  );
  const activeCategoryNames = useMemo(
    () =>
      menuCategories
        .filter((category) => category.isActive)
        .map((category) => category.name),
    [menuCategories],
  );
  const activeCategoryNameSafe =
    activeCategoryNames.includes(activeCategoryName)
      ? activeCategoryName
      : activeCategoryNames[0];
  const activeMenuItems = menuItems.filter(
    (item) =>
      item.category === activeCategoryNameSafe &&
      item.isActive &&
      activeCategoryNames.includes(item.category),
  );

  const subtotal = useMemo(() => getCartGrossSubtotal(cart), [cart]);
  const itemDiscountTotal = useMemo(() => getCartItemDiscountTotal(cart), [cart]);
  const cartNetSubtotal = Math.max(subtotal - itemDiscountTotal, 0);

  const totalQuantity = useMemo(() => getCartQuantity(cart), [cart]);

  const pendingOrderCount = useMemo(
    () => pendingOrders.reduce((total, order) => total + getCartQuantity(order.items), 0),
    [pendingOrders],
  );
  const appData = useMemo<AppStateData>(
    () => ({
      menuCategories,
      menuItems,
      pendingOrders,
      completedTransactions,
      legacySales,
      legacyImportBatches,
      expenses,
      dailyClosings,
      googleSheetSyncSettings,
      googleSheetSyncLogs,
      receiptCounter,
    }),
    [
      completedTransactions,
      dailyClosings,
      expenses,
      googleSheetSyncLogs,
      googleSheetSyncSettings,
      legacyImportBatches,
      legacySales,
      menuCategories,
      menuItems,
      pendingOrders,
      receiptCounter,
    ],
  );
  const appDataRef = useRef(appData);
  const syncQueueRef = useRef(syncQueue);
  const syncMetaRef = useRef(syncMeta);

  useEffect(() => {
    saveAppState(appData);
    appDataRef.current = appData;
  }, [appData]);

  useEffect(() => {
    syncQueueRef.current = syncQueue;
  }, [syncQueue]);

  useEffect(() => {
    syncMetaRef.current = syncMeta;
  }, [syncMeta]);

  const applyAuthSession = useCallback(async (session: Session | null) => {
    if (!canUseSupabase()) {
      setAuthStatus('local');
      setAuthProfile(null);
      setSyncStatus('local');
      return;
    }

    if (!session?.user) {
      setAuthStatus('unauthenticated');
      setAuthProfile(null);
      setSyncStatus('login-required');
      return;
    }

    const profile = await fetchUserProfile(session.user);

    setAuthProfile(profile);
    setAuthStatus('authenticated');
    setAuthError('');
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!canUseSupabase()) {
      setAuthStatus('local');
      setSyncStatus('local');
      return () => undefined;
    }

    const loadSession = async () => {
      try {
        const session = await getCurrentSession();

        if (isActive) {
          await applyAuthSession(session);
        }
      } catch (error) {
        if (isActive) {
          setAuthStatus('unauthenticated');
          setAuthProfile(null);
          setSyncStatus('login-required');
          setAuthError(
            error instanceof Error
              ? error.message
              : 'Sesi login tidak bisa dibaca.',
          );
        }
      }
    };

    void loadSession();

    const unsubscribe = onSupabaseAuthChange((session) => {
      if (isActive) {
        void applyAuthSession(session);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [applyAuthSession]);

  useEffect(() => {
    if (!canAccessTab(activeTab, effectiveRole)) {
      setActiveTab('cashier');
    }
  }, [activeTab, effectiveRole]);

  const replaceSyncQueue = useCallback((nextQueue: SyncOperation[]) => {
    syncQueueRef.current = nextQueue;
    saveSyncQueue(nextQueue);
    setSyncQueue(nextQueue);
  }, []);

  const updateSyncMeta = useCallback((nextMeta: SyncMeta) => {
    syncMetaRef.current = nextMeta;
    saveSyncMeta(nextMeta);
    setSyncMeta(nextMeta);
  }, []);

  const applyCloudAppData = useCallback((data: AppStateData) => {
    setMenuCategories(data.menuCategories);
    setMenuItems(data.menuItems);
    setPendingOrders(data.pendingOrders);
    setCompletedTransactions(data.completedTransactions);
    setLegacySales(data.legacySales);
    setLegacyImportBatches(data.legacyImportBatches);
    setExpenses(data.expenses);
    setDailyClosings(data.dailyClosings);
    setGoogleSheetSyncSettings(data.googleSheetSyncSettings);
    setGoogleSheetSyncLogs(data.googleSheetSyncLogs);
    setReceiptCounter(data.receiptCounter);
    setActiveCategoryName(
      data.menuCategories.find((category) => category.isActive)?.name ??
        data.menuItems[0]?.category ??
        initialMenuCategories[0].name,
    );
    saveAppState(data);
    appDataRef.current = data;
  }, []);

  const enqueueSyncOperations = useCallback(
    (operations: Array<Omit<SyncOperation, 'id' | 'createdAt'>>) => {
      setSyncQueue((currentQueue) => {
        const nextQueue = operations.reduce(
          (queue, operation) => addSyncOperation(queue, operation),
          currentQueue,
        );

        syncQueueRef.current = nextQueue;
        saveSyncQueue(nextQueue);

        return nextQueue;
      });
      setSyncStatus(
        canUseSupabase()
          ? authStatus === 'authenticated'
            ? 'pending'
            : 'login-required'
          : 'local',
      );
    },
    [authStatus],
  );

  const processSyncQueue = useCallback(
    async ({ pullAfterSuccess = true } = {}) => {
      if (!canUseSupabase()) {
        setSyncStatus('local');
        return;
      }

      if (authStatus !== 'authenticated') {
        setSyncStatus('login-required');
        return;
      }

      if (isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;
      setSyncStatus('syncing');

      let remainingQueue = syncQueueRef.current;

      try {
        for (const operation of syncQueueRef.current) {
          await pushSyncOperation(operation);
          remainingQueue = removeSyncOperation(remainingQueue, operation.id);
          replaceSyncQueue(remainingQueue);
        }

        const nextMeta = {
          lastSyncedAt: new Date().toISOString(),
          lastError: null,
        };

        updateSyncMeta(nextMeta);

        if (pullAfterSuccess && remainingQueue.length === 0) {
          const cloudData = await pullCloudAppState(appDataRef.current);

          if (cloudData) {
            applyCloudAppData(cloudData);
          }
        }

        setSyncStatus(remainingQueue.length > 0 ? 'pending' : 'synced');
      } catch (error) {
        updateSyncMeta({
          lastSyncedAt: syncMetaRef.current.lastSyncedAt,
          lastError:
            error instanceof Error
              ? error.message
              : 'Sinkronisasi Supabase gagal.',
        });
        setSyncStatus('error');
      } finally {
        isSyncingRef.current = false;
      }
    },
    [applyCloudAppData, authStatus, replaceSyncQueue, updateSyncMeta],
  );

  useEffect(() => {
    if (authStatus === 'loading') {
      return;
    }

    void processSyncQueue({ pullAfterSuccess: true });
  }, [authStatus, processSyncQueue]);

  useEffect(() => {
    const handleOnline = () => {
      void processSyncQueue({ pullAfterSuccess: true });
    };

    window.addEventListener('online', handleOnline);

    return () => window.removeEventListener('online', handleOnline);
  }, [processSyncQueue]);

  useEffect(() => {
    if (
      syncQueue.length === 0 ||
      !canUseSupabase() ||
      authStatus !== 'authenticated' ||
      isSyncingRef.current
    ) {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      void processSyncQueue({ pullAfterSuccess: false });
    }, 500);

    return () => window.clearTimeout(syncTimer);
  }, [authStatus, processSyncQueue, syncQueue]);

  const loginToSupabase = async (email: string, password: string) => {
    setAuthError('');
    setIsAuthSubmitting(true);

    try {
      await signInToSupabase(email, password);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Email atau password salah.',
      );
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const logoutFromSupabase = async () => {
    setAuthError('');

    try {
      await signOutFromSupabase();
      setAuthProfile(null);
      setAuthStatus('unauthenticated');
      setSyncStatus('login-required');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Gagal keluar dari akun.',
      );
    }
  };

  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    const id = `${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const nextItems = [...menuItems, { ...item, id }];

    setMenuItems(nextItems);
    enqueueSyncOperations([createMenuSyncOperation(nextItems, menuCategories)]);
    setActiveCategoryName(item.category);
  };

  const updateMenuItem = (id: string, updates: Partial<Omit<MenuItem, 'id'>>) => {
    const nextItems = menuItems.map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    );

    setMenuItems(nextItems);
    enqueueSyncOperations([createMenuSyncOperation(nextItems, menuCategories)]);
  };

  const toggleMenuItem = (id: string) => {
    const nextItems = menuItems.map((item) =>
      item.id === id ? { ...item, isActive: !item.isActive } : item,
    );

    setMenuItems(nextItems);
    enqueueSyncOperations([createMenuSyncOperation(nextItems, menuCategories)]);
  };

  const addMenuCategory = (name: string) => {
    const cleanName = name.trim();

    if (!cleanName || menuCategories.some((category) => category.name === cleanName)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const nextCategories = [
      ...menuCategories,
      {
        id: `category-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        name: cleanName,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        items: [],
      },
    ];

    setMenuCategories(nextCategories);
    enqueueSyncOperations([createMenuSyncOperation(menuItems, nextCategories)]);
    setActiveCategoryName(cleanName);
  };

  const renameMenuCategory = (id: string, nextName: string) => {
    const cleanName = nextName.trim();
    const category = menuCategories.find((item) => item.id === id);

    if (!category || !cleanName) {
      return;
    }

    const timestamp = new Date().toISOString();
    const nextCategories = menuCategories.map((item) =>
      item.id === id ? { ...item, name: cleanName, updatedAt: timestamp } : item,
    );
    const nextItems = menuItems.map((item) =>
      item.category === category.name ? { ...item, category: cleanName } : item,
    );

    setMenuCategories(nextCategories);
    setMenuItems(nextItems);
    enqueueSyncOperations([createMenuSyncOperation(nextItems, nextCategories)]);
    setActiveCategoryName((currentCategory) =>
      currentCategory === category.name ? cleanName : currentCategory,
    );
  };

  const toggleMenuCategory = (id: string) => {
    const timestamp = new Date().toISOString();
    const nextCategories = menuCategories.map((category) =>
      category.id === id
        ? { ...category, isActive: !category.isActive, updatedAt: timestamp }
        : category,
    );

    setMenuCategories(nextCategories);
    enqueueSyncOperations([createMenuSyncOperation(menuItems, nextCategories)]);
  };

  const addItem = (item: MenuItem) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((cartItem) => cartItem.id === item.id);

      if (existingItem) {
        return currentCart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }

      return [
        ...currentCart,
        {
          id: item.id,
          nameSnapshot: item.name,
          categorySnapshot: item.category,
          unitPriceSnapshot: item.price,
          hppSnapshot: item.hpp ?? 0,
          quantity: 1,
        },
      ];
    });
  };

  const increaseQuantity = (id: string) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const decreaseQuantity = (id: string) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(item.quantity - 1, 0) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id));
  };

  const applyItemDiscount = (
    id: string,
    discountType: DiscountType,
    discountValue: number,
  ) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== id) {
          return item;
        }

        if (discountType === 'none' || discountValue <= 0) {
          return {
            ...item,
            itemDiscountType: 'none',
            itemDiscountValue: 0,
            itemDiscountAmount: 0,
          };
        }

        const nextItem = {
          ...item,
          itemDiscountType: discountType,
          itemDiscountValue:
            discountType === 'percentage'
              ? Math.min(discountValue, 100)
              : discountValue,
        };

        return {
          ...nextItem,
          itemDiscountAmount: getCartLineDiscount(nextItem),
        };
      }),
    );
    setDiscountItemId(null);
  };

  const clearCart = () => {
    setCart([]);
  };

  const savePendingOrder = (label: string) => {
    if (cart.length === 0) {
      return;
    }

    const cleanLabel = label.trim();

    if (!cleanLabel) {
      return;
    }

    const pendingOrder: PendingOrder = {
      id: `pending-${Date.now()}`,
      label: cleanLabel,
      items: cart.map((item) => ({ ...item })),
      createdAt: new Date().toISOString(),
    };

    setPendingOrders((orders) => [pendingOrder, ...orders]);
    enqueueSyncOperations([createPendingOrderUpsertOperation(pendingOrder)]);
    setCart([]);
    setIsSaveOrderOpen(false);
  };

  const resumePendingOrder = (order: PendingOrder) => {
    setCart(order.items.map((item) => ({ ...item })));
    setPendingOrders((orders) =>
      orders.filter((pendingOrder) => pendingOrder.id !== order.id),
    );
    enqueueSyncOperations([createPendingOrderDeleteOperation(order.id)]);
    setPendingOrderAction(null);
  };

  const deletePendingOrder = (order: PendingOrder) => {
    setPendingOrders((orders) =>
      orders.filter((pendingOrder) => pendingOrder.id !== order.id),
    );
    enqueueSyncOperations([createPendingOrderDeleteOperation(order.id)]);
    setPendingOrderAction(null);
  };

  const requestResumePendingOrder = (order: PendingOrder) => {
    if (cart.length > 0) {
      setPendingOrderAction({ type: 'resume', order });
      return;
    }

    resumePendingOrder(order);
  };

  const completeCheckout = (
    checkout: Pick<
      CompletedTransaction,
      | 'discountType'
      | 'discountValue'
      | 'discountAmount'
      | 'transactionDiscountAmount'
      | 'totalAfterDiscount'
      | 'paymentMethod'
      | 'paidAmount'
      | 'changeAmount'
    >,
  ) => {
    const completedAt = new Date();
    const nextReceiptCounter = receiptCounter + 1;
    const transaction: CompletedTransaction = {
      receiptNumber: createReceiptNumber(completedAt, nextReceiptCounter),
      dateTime: completedAt.toISOString(),
      cashierName: CASHIER_NAME,
      items: cart.map((item) => ({
        ...item,
        itemDiscountAmount: getCartLineDiscount(item),
        hppSnapshot: item.hppSnapshot ?? 0,
        subtotal: getCartLineGross(item),
        grossLineTotal: getCartLineGross(item),
        lineNetTotal: getCartLineNet(item),
        unitHppSnapshot: item.hppSnapshot ?? 0,
        totalHpp: (item.hppSnapshot ?? 0) * item.quantity,
        profit: getCartLineNet(item) - (item.hppSnapshot ?? 0) * item.quantity,
      })),
      subtotalBeforeDiscount: subtotal,
      itemDiscountAmount: itemDiscountTotal,
      ...checkout,
      status: 'completed',
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
    };

    setCompletedTransactions((transactions) => [...transactions, transaction]);
    setReceiptCounter(nextReceiptCounter);
    enqueueSyncOperations(
      createTransactionSyncOperations(transaction, nextReceiptCounter),
    );
    setCart([]);
    setIsCheckoutOpen(false);
  };

  const importLegacySales = (batch: LegacyImportBatch, sales: LegacySale[]) => {
    setLegacyImportBatches((batches) => [batch, ...batches]);
    setLegacySales((currentSales) => [...currentSales, ...sales]);
    enqueueSyncOperations([createLegacyImportSyncOperation(batch, sales)]);
  };

  const voidReceipt = (receiptNumber: string, reason: string) => {
    const voidedAt = new Date().toISOString();
    const voidedBy = authProfile?.fullName ?? CASHIER_NAME;
    let voidedTransaction: CompletedTransaction | null = null;

    setCompletedTransactions((transactions) =>
      transactions.map((transaction) => {
        if (transaction.receiptNumber !== receiptNumber) {
          return transaction;
        }

        voidedTransaction = {
          ...transaction,
          status: 'voided',
          voidedAt,
          voidedBy,
          voidReason: reason,
        };

        return voidedTransaction;
      }),
    );

    if (voidedTransaction) {
      enqueueSyncOperations(
        createTransactionSyncOperations(voidedTransaction, receiptCounter),
      );
    }
  };

  const addExpense = (expense: Expense) => {
    setExpenses((currentExpenses) => [expense, ...currentExpenses]);
    enqueueSyncOperations([createExpenseUpsertOperation(expense)]);
  };

  const updateExpense = (expense: Expense) => {
    setExpenses((currentExpenses) =>
      currentExpenses.map((currentExpense) =>
        currentExpense.id === expense.id ? expense : currentExpense,
      ),
    );
    enqueueSyncOperations([createExpenseUpsertOperation(expense)]);
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses((currentExpenses) =>
      currentExpenses.filter((expense) => expense.id !== expenseId),
    );
    enqueueSyncOperations([createExpenseDeleteOperation(expenseId)]);
  };

  const saveDailyClosing = (closing: DailyClosing) => {
    setDailyClosings((currentClosings) => {
      const existingClosing = currentClosings.some(
        (currentClosing) => currentClosing.closingDate === closing.closingDate,
      );

      if (existingClosing) {
        return currentClosings.map((currentClosing) =>
          currentClosing.closingDate === closing.closingDate
            ? closing
            : currentClosing,
        );
      }

      return [closing, ...currentClosings];
    });
    enqueueSyncOperations([createDailyClosingSyncOperation(closing)]);
  };

  const saveGoogleSheetSettings = (settings: GoogleSheetSyncSettings) => {
    setGoogleSheetSyncSettings(settings);
    enqueueSyncOperations([createGoogleSheetSettingsSyncOperation(settings)]);
  };

  const addGoogleSheetSyncLog = (log: GoogleSheetSyncLog) => {
    setGoogleSheetSyncLogs((currentLogs) => [log, ...currentLogs].slice(0, 50));
    enqueueSyncOperations([createGoogleSheetSyncLogOperation(log)]);
  };

  const importAppData = (data: AppStateData) => {
    setMenuCategories(data.menuCategories);
    setMenuItems(data.menuItems);
    setPendingOrders(data.pendingOrders);
    setCompletedTransactions(data.completedTransactions);
    setLegacySales(data.legacySales);
    setLegacyImportBatches(data.legacyImportBatches);
    setExpenses(data.expenses);
    setDailyClosings(data.dailyClosings);
    setGoogleSheetSyncSettings(data.googleSheetSyncSettings);
    setGoogleSheetSyncLogs(data.googleSheetSyncLogs);
    setReceiptCounter(data.receiptCounter);
    setCart([]);
    setIsCheckoutOpen(false);
    setIsSaveOrderOpen(false);
    setPendingOrderAction(null);
    setActiveCategoryName(
      data.menuCategories.find((category) => category.isActive)?.name ??
        data.menuItems[0]?.category ??
        initialMenuCategories[0].name,
    );
  };

  const resetLocalData = () => {
    const defaultState = createDefaultAppState(defaultMenuItems);

    importAppData(defaultState);
  };

  const resetOperationalTestingData = () => {
    setPendingOrders([]);
    setCompletedTransactions([]);
    setLegacySales([]);
    setLegacyImportBatches([]);
    setExpenses([]);
    setDailyClosings([]);
    setGoogleSheetSyncLogs([]);
    setReceiptCounter(0);
    replaceSyncQueue([]);
    saveSyncMeta({ lastSyncedAt: null, lastError: null });
    setSyncMeta({ lastSyncedAt: null, lastError: null });
    setCart([]);
    setIsCheckoutOpen(false);
    setIsSaveOrderOpen(false);
    setPendingOrderAction(null);
  };

  if (authStatus === 'loading' && canUseSupabase()) {
    return <LoadingScreen />;
  }

  if (authStatus === 'unauthenticated' && canUseSupabase()) {
    return (
      <LoginScreen
        errorMessage={authError}
        isLoading={isAuthSubmitting}
        onSubmit={loginToSupabase}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-1 bg-white border-r border-gray-100">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-coffee to-coffee-light flex items-center justify-center shadow-lg">
              <span className="text-white font-extrabold text-lg">SC</span>
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-coffee-dark tracking-tight">Santara</h1>
              <p className="text-xs text-gray-500 font-medium">Coffee POS</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item w-full ${activeTab === tab.id ? 'nav-item-active' : ''}`}
              >
                <span className="grid size-8 place-items-center rounded-xl bg-coffee/10 text-sm font-black text-coffee">
                  {tab.label.slice(0, 1)}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* User Section */}
          <div className="px-4 py-4 border-t border-gray-100">
            <AuthSummary
              authProfile={authProfile}
              authStatus={authStatus}
              effectiveRole={effectiveRole}
              onLogout={logoutFromSupabase}
              roleMissing={Boolean(authProfile?.isMissing)}
            />
            <SyncStatusIndicator
              lastSyncedAt={syncMeta.lastSyncedAt}
              onSyncNow={() => processSyncQueue({ pullAfterSuccess: true })}
              pendingCount={syncQueue.length}
              status={syncStatus}
            />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coffee to-coffee-light flex items-center justify-center shadow-md">
              <span className="text-white font-extrabold">SC</span>
            </div>
            <div>
              <h1 className="font-extrabold text-coffee-dark">Santara Coffee</h1>
              <p className="text-xs text-gray-500">Kasir</p>
            </div>
          </div>
          <SyncStatusIndicator
            lastSyncedAt={syncMeta.lastSyncedAt}
            onSyncNow={() => processSyncQueue({ pullAfterSuccess: true })}
            pendingCount={syncQueue.length}
            status={syncStatus}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="min-w-0 flex-1 pt-16 lg:ml-64 lg:pt-0">
        <div className="flex min-h-[calc(100dvh-4rem)] flex-col lg:h-screen lg:min-h-0">
          {/* Quick Stats Bar */}
          <div className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3">
            <div className="flex items-center gap-4 overflow-x-auto">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-50">
                <span className="text-sm font-semibold text-gray-500">Mode:</span>
                <span className="badge badge-primary">{getActiveTabLabel(activeTab)}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-50">
                <span className="text-sm font-semibold text-gray-500">Cart:</span>
                <span className="font-bold text-coffee-dark">{totalQuantity} item</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-50">
                <span className="text-sm font-semibold text-gray-500">Subtotal:</span>
                <span className="font-bold text-coffee-dark">{formatRupiah(subtotal)}</span>
              </div>
              {pendingOrders.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50">
                  <span className="text-sm font-semibold text-amber-700">Pending:</span>
                  <span className="font-bold text-amber-700">{pendingOrders.length} order</span>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
            <div className="grid grid-flow-col auto-cols-fr gap-1">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-0 flex flex-col items-center gap-1 rounded-xl px-1 py-2 transition-all ${
                    activeTab === tab.id
                      ? 'bg-coffee/10 text-coffee-dark'
                      : 'text-gray-400'
                  }`}
                >
                  <span className="grid size-6 place-items-center rounded-full bg-current/10 text-xs font-black">
                    {tab.label.slice(0, 1)}
                  </span>
                  <span className="max-w-full truncate text-[10px] font-semibold leading-tight">
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </nav>

          {/* Page Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-28 lg:px-6 lg:py-6 lg:pb-6">
            {activeTab === 'cashier' && (
              <CashierView
                activeCategoryName={activeCategoryNameSafe}
                activeMenuItems={activeMenuItems}
                cart={cart}
                categoryNames={activeCategoryNames}
                clearCart={clearCart}
                decreaseQuantity={decreaseQuantity}
                increaseQuantity={increaseQuantity}
                latestTransaction={latestTransaction}
                onAddItem={addItem}
                onDiscountItem={setDiscountItemId}
                onDeletePending={(order) =>
                  setPendingOrderAction({ type: 'delete', order })
                }
                onOpenCheckout={() => setIsCheckoutOpen(true)}
                onOpenSaveOrder={() => setIsSaveOrderOpen(true)}
                onResumePending={requestResumePendingOrder}
                pendingOrderCount={pendingOrderCount}
                pendingOrders={pendingOrders}
                removeItem={removeItem}
                setActiveCategoryName={setActiveCategoryName}
                subtotal={subtotal}
                itemDiscountTotal={itemDiscountTotal}
                cartNetSubtotal={cartNetSubtotal}
                totalQuantity={totalQuantity}
              />
            )}

            {activeTab === 'menu' && canAccessTab('menu', effectiveRole) && (
              <MenuAdmin
                appData={appData}
                categories={menuCategories}
                defaultMenuItems={defaultMenuItems}
                items={menuItems}
                onAddCategory={addMenuCategory}
                onAddItem={addMenuItem}
                onImportData={importAppData}
                onResetData={resetLocalData}
                onRenameCategory={renameMenuCategory}
                onToggleItem={toggleMenuItem}
                onToggleCategory={toggleMenuCategory}
                onUpdateItem={updateMenuItem}
              />
            )}

            {activeTab === 'receipts' && (
              <ReceiptHistory
                canVoid={effectiveRole === 'owner' || effectiveRole === 'admin'}
                currentUserName={authProfile?.fullName ?? CASHIER_NAME}
                onVoidReceipt={voidReceipt}
                transactions={completedTransactions}
              />
            )}

            {activeTab === 'reports' && canAccessTab('reports', effectiveRole) && (
              <Reports
                currentUserName={authProfile?.fullName ?? CASHIER_NAME}
                dailyClosings={dailyClosings}
                expenses={expenses}
                googleSheetSyncLogs={googleSheetSyncLogs}
                googleSheetSyncSettings={googleSheetSyncSettings}
                legacyImportBatches={legacyImportBatches}
                legacySales={legacySales}
                onAddGoogleSheetSyncLog={addGoogleSheetSyncLog}
                onSaveLegacyImport={importLegacySales}
                onSaveClosing={saveDailyClosing}
                onSaveGoogleSheetSettings={saveGoogleSheetSettings}
                onResetOperationalData={resetOperationalTestingData}
                transactions={completedTransactions}
              />
            )}

            {activeTab === 'expenses' && canAccessTab('expenses', effectiveRole) && (
              <Expenses
                currentUserName={authProfile?.fullName ?? CASHIER_NAME}
                expenses={expenses}
                onAddExpense={addExpense}
                onDeleteExpense={deleteExpense}
                onUpdateExpense={updateExpense}
              />
            )}
          </div>
        </div>
      </main>

      {isCheckoutOpen && (
        <CheckoutModal
          onClose={() => setIsCheckoutOpen(false)}
          onComplete={completeCheckout}
          itemDiscountTotal={itemDiscountTotal}
          subtotal={subtotal}
        />
      )}

      {discountItemId && (
        <ItemDiscountModal
          item={cart.find((item) => item.id === discountItemId) ?? null}
          onApply={applyItemDiscount}
          onClose={() => setDiscountItemId(null)}
        />
      )}

      <SaveOrderModal
        isOpen={isSaveOrderOpen}
        onClose={() => setIsSaveOrderOpen(false)}
        onSave={savePendingOrder}
      />

      {pendingOrderAction && (
        <ConfirmOrderModal
          action={pendingOrderAction.type}
          onCancel={() => setPendingOrderAction(null)}
          onConfirm={() => {
            if (pendingOrderAction.type === 'resume') {
              resumePendingOrder(pendingOrderAction.order);
              return;
            }
            deletePendingOrder(pendingOrderAction.order);
          }}
          order={pendingOrderAction.order}
        />
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="card text-center max-w-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-coffee to-coffee-light flex items-center justify-center shadow-lg mb-4">
          <span className="text-white font-extrabold text-xl">SC</span>
        </div>
        <h1 className="text-xl font-extrabold text-coffee-dark">Memeriksa sesi login...</h1>
        <p className="text-sm text-gray-500 mt-2">Santara POS sedang menyiapkan akses cloud.</p>
      </div>
    </div>
  );
}

type AuthSummaryProps = {
  authProfile: UserProfile | null;
  authStatus: AuthStatus;
  effectiveRole: UserRole;
  onLogout: () => void;
  roleMissing: boolean;
};

function AuthSummary({
  authProfile,
  authStatus,
  effectiveRole,
  onLogout,
  roleMissing,
}: AuthSummaryProps) {
  if (authStatus === 'local') {
    return (
      <p className="mt-1 text-[11px] font-bold text-santara-roast/55">
        Mode lokal/demo: Supabase belum dikonfigurasi.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-black">
      <span className="rounded-full bg-white px-2 py-1 text-santara-roast ring-1 ring-santara-latte">
        {authProfile?.fullName ?? 'Santara User'} - {getRoleLabel(effectiveRole)}
      </span>
      {roleMissing && (
        <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700 ring-1 ring-amber-200">
          Role belum dikonfigurasi
        </span>
      )}
      <button
        className="rounded-full bg-white px-2.5 py-1 text-santara-clay ring-1 ring-santara-latte transition hover:bg-santara-cream"
        onClick={onLogout}
        type="button"
      >
        Keluar
      </button>
    </div>
  );
}

type CashierViewProps = {
  activeCategoryName: string;
  activeMenuItems: MenuItem[];
  cart: CartItem[];
  cartNetSubtotal: number;
  categoryNames: string[];
  clearCart: () => void;
  decreaseQuantity: (id: string) => void;
  increaseQuantity: (id: string) => void;
  itemDiscountTotal: number;
  latestTransaction: CompletedTransaction | undefined;
  onAddItem: (item: MenuItem) => void;
  onDeletePending: (order: PendingOrder) => void;
  onDiscountItem: (id: string) => void;
  onOpenCheckout: () => void;
  onOpenSaveOrder: () => void;
  onResumePending: (order: PendingOrder) => void;
  pendingOrderCount: number;
  pendingOrders: PendingOrder[];
  removeItem: (id: string) => void;
  setActiveCategoryName: (category: string) => void;
  subtotal: number;
  totalQuantity: number;
};

function CashierView({
  activeCategoryName,
  activeMenuItems,
  cart,
  cartNetSubtotal,
  categoryNames,
  clearCart,
  decreaseQuantity,
  increaseQuantity,
  itemDiscountTotal,
  latestTransaction,
  onAddItem,
  onDeletePending,
  onDiscountItem,
  onOpenCheckout,
  onOpenSaveOrder,
  onResumePending,
  pendingOrderCount,
  pendingOrders,
  removeItem,
  setActiveCategoryName,
  subtotal,
  totalQuantity,
}: CashierViewProps) {
  return (
    <div className="flex min-h-full flex-col gap-4 lg:h-full lg:flex-row lg:gap-6">
      {/* Left Panel - Menu */}
      <div className="flex min-h-[55dvh] flex-col min-w-0 lg:min-h-0 lg:flex-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-coffee-dark tracking-tight">Menu</h2>
            <p className="text-sm text-gray-500 mt-0.5">{activeMenuItems.length} item tersedia</p>
          </div>
          <span className="badge badge-primary">{activeCategoryName}</span>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
          {categoryNames.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategoryName(category)}
              className={`cat-pill ${activeCategoryName === category ? 'cat-pill-active' : 'cat-pill-inactive'}`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeMenuItems.length === 0 ? (
              <div className="col-span-full empty-state">
                <div className="text-4xl mb-3">☕</div>
                <p className="font-semibold text-gray-500">Tidak ada menu aktif</p>
              </div>
            ) : (
              activeMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onAddItem(item)}
                  className="menu-item text-left"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-1">
                      <h3 className="font-bold text-coffee-dark text-sm leading-tight">{item.name}</h3>
                      <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{item.category}</p>
                    </div>
                    <p className="text-lg font-extrabold text-coffee mt-2">{formatRupiah(item.price)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="flex flex-col lg:w-[400px] xl:w-[440px]">
        <div className="card flex flex-col overflow-visible lg:flex-1 lg:overflow-hidden">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-extrabold text-coffee-dark tracking-tight">Keranjang</h2>
              <p className="text-xs text-gray-500">{cart.length} item</p>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="btn btn-ghost text-sm">
                Clear All
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="max-h-[55dvh] overflow-y-auto py-4 space-y-3 lg:max-h-none lg:flex-1">
            {cart.length === 0 ? (
              <div className="empty-state min-h-40 lg:h-full">
                <div className="text-5xl mb-4">🛒</div>
                <p className="font-semibold text-gray-500">Keranjang kosong</p>
                <p className="text-sm text-gray-400 mt-1">Tap menu untuk menambahkan</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-bold text-coffee-dark">{item.nameSnapshot}</h4>
                      <p className="text-xs text-gray-400">{item.categorySnapshot}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="qty-control">
                      <button
                        onClick={() => decreaseQuantity(item.id)}
                        className="qty-btn qty-btn-minus"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button
                        onClick={() => increaseQuantity(item.id)}
                        className="qty-btn qty-btn-plus"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-bold text-coffee-dark">{formatRupiah(getCartLineNet(item))}</p>
                  </div>
                  <button
                    className="mt-3 rounded-full bg-white px-3 py-2 text-xs font-black text-santara-bean ring-1 ring-santara-latte transition hover:bg-santara-cream"
                    onClick={() => onDiscountItem(item.id)}
                    type="button"
                  >
                    Diskon Item
                  </button>
                </div>
              ))
            )}
            <PendingOrdersSection
              onDelete={onDeletePending}
              onResume={onResumePending}
              orders={pendingOrders}
            />
          </div>

          {/* Cart Summary */}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-semibold">{formatRupiah(subtotal)}</span>
            </div>
            {itemDiscountTotal > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Diskon</span>
                <span className="font-semibold">-{formatRupiah(itemDiscountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg pt-2 border-t border-gray-100">
              <span className="font-bold">Total</span>
              <span className="font-extrabold text-coffee">{formatRupiah(cartNetSubtotal)}</span>
            </div>

            <button
              onClick={onOpenCheckout}
              disabled={cart.length === 0}
              className="btn btn-primary w-full mt-4"
            >
              Bayar Sekarang
            </button>

            {cart.length > 0 && (
              <button
                onClick={onOpenSaveOrder}
                className="btn btn-secondary w-full"
              >
                Simpan Order
              </button>
            )}
          </div>

          {latestTransaction && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-coffee-dark">Struk Terakhir</h3>
                  <p className="text-xs text-gray-500">{latestTransaction.receiptNumber}</p>
                </div>
                <button
                  className="btn btn-secondary px-3 py-2 text-xs"
                  onClick={() => window.print()}
                  type="button"
                >
                  Print
                </button>
              </div>
              <div className="max-h-[48dvh] overflow-y-auto lg:max-h-72">
                <ReceiptPreview transaction={latestTransaction} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart FAB */}
      {cart.length > 0 && (
        <button
          onClick={onOpenCheckout}
          className="lg:hidden fixed bottom-[92px] left-4 right-4 z-30 btn btn-primary justify-between shadow-xl rounded-2xl px-5 py-4 sm:left-auto sm:right-6"
        >
          <span>Bayar</span>
          <span className="ml-2 font-extrabold">{formatRupiah(cartNetSubtotal)}</span>
        </button>
      )}
    </div>
  );
}

type PendingOrdersSectionProps = {
  orders: PendingOrder[];
  onResume: (order: PendingOrder) => void;
  onDelete: (order: PendingOrder) => void;
};

function PendingOrdersSection({
  orders,
  onResume,
  onDelete,
}: PendingOrdersSectionProps) {
  if (orders.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-santara-latte/50 bg-white/80 backdrop-blur-sm p-4 mt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black">Order Tersimpan</h3>
        <span className="badge badge-gold">
          {orders.length}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {orders.map((order) => (
          <article
            className="rounded-xl bg-santara-foam/80 p-3 border border-santara-latte/30 transition-all hover:shadow-soft"
            key={order.id}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{order.label}</p>
                <p className="mt-0.5 text-[11px] font-bold text-santara-roast/60">
                  {getCartQuantity(order.items)} item -{' '}
                  {formatRupiah(
                    Math.max(
                      getCartGrossSubtotal(order.items) -
                        getCartItemDiscountTotal(order.items),
                      0,
                    ),
                  )} -{' '}
                  {formatShortTime(order.createdAt)}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="btn-primary px-3 py-2.5 text-xs font-bold rounded-xl"
                onClick={() => onResume(order)}
                type="button"
              >
                Lanjutkan
              </button>
              <button
                className="px-3 py-2.5 text-xs font-bold text-santara-clay rounded-xl border border-santara-latte/50 bg-white transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-500"
                onClick={() => onDelete(order)}
                type="button"
              >
                Hapus
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

type SyncStatusIndicatorProps = {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  onSyncNow: () => void;
};

function SyncStatusIndicator({
  status,
  pendingCount,
  lastSyncedAt,
  onSyncNow,
}: SyncStatusIndicatorProps) {
  const label = getSyncStatusLabel(status);
  const dotClass = getSyncStatusDotClass(status);
  const detail =
    pendingCount > 0
      ? `${pendingCount} pending`
      : lastSyncedAt && status === 'synced'
        ? formatShortTime(lastSyncedAt)
        : '';

  return (
    <button
      onClick={onSyncNow}
      disabled={status === 'syncing'}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
      title="Klik untuk sync"
    >
      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
      <span>{label}</span>
      {detail && <span className="text-gray-400">{detail}</span>}
    </button>
  );
}

type StatusTileProps = {
  label: string;
  value: string;
};

function StatusTile({ label, value }: StatusTileProps) {
  return (
    <div className="status-tile hover:shadow-elegant transition-all duration-200">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-santara-sage/80">
        {label}
      </p>
      <p className="mt-0.5 truncate text-base font-black text-santara-roast tracking-tight">
        {value}
      </p>
    </div>
  );
}

type TabButtonProps = {
  isActive: boolean;
  label: string;
  onClick: () => void;
};

function TabButton({ isActive, label, onClick }: TabButtonProps) {
  return (
    <button
      className={`tab-btn ${isActive ? 'tab-btn-active' : 'tab-btn-inactive'}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function getCartGrossSubtotal(items: CartItem[]) {
  return items.reduce(
    (total, item) => total + getCartLineGross(item),
    0,
  );
}

function getCartItemDiscountTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + getCartLineDiscount(item), 0);
}

function getCartLineGross(item: CartItem) {
  return item.unitPriceSnapshot * item.quantity;
}

function getCartLineDiscount(item: CartItem) {
  const grossLineTotal = getCartLineGross(item);
  const discountType = item.itemDiscountType ?? 'none';
  const discountValue = item.itemDiscountValue ?? 0;

  if (discountType === 'fixed') {
    return Math.min(discountValue, grossLineTotal);
  }

  if (discountType === 'percentage') {
    return Math.min(
      Math.round((grossLineTotal * Math.min(discountValue, 100)) / 100),
      grossLineTotal,
    );
  }

  return 0;
}

function getCartLineNet(item: CartItem) {
  return Math.max(getCartLineGross(item) - getCartLineDiscount(item), 0);
}

function getCartQuantity(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function getActiveTabLabel(tab: AppTab) {
  const labels: Record<AppTab, string> = {
    cashier: 'Kasir',
    menu: 'Kelola Menu',
    receipts: 'Riwayat Struk',
    reports: 'Laporan',
    expenses: 'Pengeluaran',
  };

  return labels[tab];
}

function canAccessTab(tab: AppTab, role: UserRole) {
  if (role === 'owner' || role === 'admin') {
    return true;
  }

  return tab === 'cashier' || tab === 'receipts';
}

function getRoleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    cashier: 'Cashier',
  };

  return labels[role];
}

function getSyncStatusLabel(status: SyncStatus) {
  const labels: Record<SyncStatus, string> = {
    local: 'Lokal',
    synced: 'Tersinkron',
    syncing: 'Menyinkronkan',
    pending: 'Menunggu',
    error: 'Error',
    'login-required': 'Login diperlukan',
  };

  return labels[status];
}

function getSyncStatusDotClass(status: SyncStatus) {
  const classes: Record<SyncStatus, string> = {
    local: 'bg-santara-sage',
    synced: 'bg-emerald-500',
    syncing: 'bg-santara-clay',
    pending: 'bg-amber-500',
    error: 'bg-red-500',
    'login-required': 'bg-amber-500',
  };

  return classes[status];
}

export default App;
