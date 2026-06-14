import type { CompletedTransaction, PaymentMethod } from '../types';

export type ReportMode = 'today' | 'date' | 'month' | 'all';

export type PaymentSummary = {
  method: PaymentMethod;
  transactionCount: number;
  total: number;
};

export type MenuSalesSummary = {
  key: string;
  name: string;
  category: string;
  quantity: number;
  grossSales: number;
  hpp: number;
  estimatedProfit: number;
};

export type SalesReport = {
  transactions: CompletedTransaction[];
  grossSales: number;
  totalDiscount: number;
  netSales: number;
  totalHpp: number;
  grossProfit: number;
  grossMargin: number;
  totalTransactions: number;
  averageTransactionValue: number;
  paymentSummary: PaymentSummary[];
  menuSales: MenuSalesSummary[];
  bestSellers: MenuSalesSummary[];
  discountedTransactionCount: number;
  averageDiscount: number;
};

const paymentMethods: PaymentMethod[] = ['Cash', 'QRIS', 'Debit'];

export function buildSalesReport(
  transactions: CompletedTransaction[],
  mode: ReportMode,
  selectedDate: string,
): SalesReport {
  const filteredTransactions = filterTransactions(transactions, mode, selectedDate);
  const grossSales = filteredTransactions.reduce(
    (total, transaction) => total + transaction.subtotalBeforeDiscount,
    0,
  );
  const totalDiscount = filteredTransactions.reduce(
    (total, transaction) => total + transaction.discountAmount,
    0,
  );
  const netSales = Math.max(grossSales - totalDiscount, 0);
  const totalHpp = filteredTransactions.reduce(
    (total, transaction) => total + getTransactionHpp(transaction),
    0,
  );
  const grossProfit = netSales - totalHpp;
  const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
  const totalTransactions = filteredTransactions.length;
  const discountedTransactions = filteredTransactions.filter(
    (transaction) => transaction.discountAmount > 0,
  );

  return {
    transactions: filteredTransactions,
    grossSales,
    totalDiscount,
    netSales,
    totalHpp,
    grossProfit,
    grossMargin,
    totalTransactions,
    averageTransactionValue:
      totalTransactions > 0 ? netSales / totalTransactions : 0,
    paymentSummary: buildPaymentSummary(filteredTransactions),
    menuSales: buildMenuSales(filteredTransactions),
    bestSellers: buildMenuSales(filteredTransactions)
      .sort((first, second) => second.quantity - first.quantity)
      .slice(0, 5),
    discountedTransactionCount: discountedTransactions.length,
    averageDiscount:
      discountedTransactions.length > 0
        ? totalDiscount / discountedTransactions.length
        : 0,
  };
}

export function getTodayInputValue() {
  return toInputDate(new Date());
}

function filterTransactions(
  transactions: CompletedTransaction[],
  mode: ReportMode,
  selectedDate: string,
) {
  if (mode === 'all') {
    return transactions;
  }

  const now = new Date();

  return transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.dateTime);

    if (Number.isNaN(transactionDate.getTime())) {
      return false;
    }

    if (mode === 'today') {
      return toInputDate(transactionDate) === toInputDate(now);
    }

    if (mode === 'date') {
      return toInputDate(transactionDate) === selectedDate;
    }

    return (
      transactionDate.getFullYear() === now.getFullYear() &&
      transactionDate.getMonth() === now.getMonth()
    );
  });
}

function buildPaymentSummary(transactions: CompletedTransaction[]): PaymentSummary[] {
  return paymentMethods.map((method) => {
    const matchingTransactions = transactions.filter(
      (transaction) => transaction.paymentMethod === method,
    );

    return {
      method,
      transactionCount: matchingTransactions.length,
      total: matchingTransactions.reduce(
        (sum, transaction) =>
          sum +
          Math.max(
            transaction.subtotalBeforeDiscount - transaction.discountAmount,
            0,
          ),
        0,
      ),
    };
  });
}

function buildMenuSales(transactions: CompletedTransaction[]): MenuSalesSummary[] {
  const menuMap = new Map<string, MenuSalesSummary>();

  transactions.forEach((transaction) => {
    transaction.items.forEach((item) => {
      const grossSales = item.subtotal;
      const hpp = (item.hppSnapshot ?? 0) * item.quantity;
      const discountAllocation = getDiscountAllocation(transaction, grossSales);
      const estimatedProfit = Math.max(grossSales - discountAllocation, 0) - hpp;
      const key = `${item.nameSnapshot}|${item.categorySnapshot}`;
      const current = menuMap.get(key);

      if (!current) {
        menuMap.set(key, {
          key,
          name: item.nameSnapshot,
          category: item.categorySnapshot,
          quantity: item.quantity,
          grossSales,
          hpp,
          estimatedProfit,
        });
        return;
      }

      current.quantity += item.quantity;
      current.grossSales += grossSales;
      current.hpp += hpp;
      current.estimatedProfit += estimatedProfit;
    });
  });

  return Array.from(menuMap.values()).sort(
    (first, second) => second.grossSales - first.grossSales,
  );
}

function getTransactionHpp(transaction: CompletedTransaction) {
  return transaction.items.reduce(
    (total, item) => total + (item.hppSnapshot ?? 0) * item.quantity,
    0,
  );
}

function getDiscountAllocation(
  transaction: CompletedTransaction,
  itemGrossSales: number,
) {
  if (transaction.discountAmount <= 0 || transaction.subtotalBeforeDiscount <= 0) {
    return 0;
  }

  return transaction.discountAmount * (itemGrossSales / transaction.subtotalBeforeDiscount);
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
