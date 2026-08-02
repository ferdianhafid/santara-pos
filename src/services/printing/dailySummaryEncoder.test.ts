import assert from 'node:assert/strict';
import test from 'node:test';
import type { DailyClosing } from '../../types';
import type { SalesReport } from '../../utils/reports';
import { SANTARA_BUSINESS } from '../../config/businesses.ts';
import {
  buildDailySummaryPrintBytes,
  buildDailySummaryText,
} from './dailySummaryEncoder.ts';

const report = {
  transactions: [],
  legacySales: [],
  expenses: [
    {
      id: 'expense-1',
      date: '2026-08-03',
      name: 'Es Batu',
      category: 'Es Batu',
      quantity: 1,
      unit: 'Pack',
      amount: 10000,
      paymentMethod: 'Cash',
      notes: '',
      createdAt: '2026-08-03T01:00:00.000Z',
      updatedAt: '2026-08-03T01:00:00.000Z',
      createdBy: 'Staff',
    },
  ],
  dailyClosing: null,
  grossSales: 70000,
  totalDiscount: 0,
  netSales: 70000,
  totalHpp: 25000,
  grossProfit: 45000,
  grossMargin: 64.28,
  totalExpenses: 10000,
  netProfit: 35000,
  netMargin: 50,
  totalTransactions: 3,
  averageTransactionValue: 23333,
  paymentSummary: [],
  expenseSummary: [],
  menuSales: [
    {
      key: 'Americano L|Coffee',
      name: 'Americano L',
      category: 'Coffee',
      quantity: 3,
      grossSales: 54000,
      discountAmount: 0,
      netSales: 54000,
      unitHpp: 6000,
      totalHpp: 18000,
      hpp: 18000,
      estimatedProfit: 36000,
      profit: 36000,
      marginRatio: 0.6667,
      margin: 66.67,
    },
  ],
  bestSellers: [],
  discountedTransactionCount: 0,
  averageDiscount: 0,
  hasLegacyData: false,
  sourceTransactionCount: 3,
  sourceLegacyCount: 0,
} satisfies SalesReport;

const closing: DailyClosing = {
  id: 'closing-2026-08-03',
  closingDate: '2026-08-03',
  cashierName: 'Staff Santara',
  grossSales: 70000,
  totalDiscount: 0,
  netSales: 70000,
  totalHpp: 25000,
  grossProfit: 45000,
  totalExpenses: 10000,
  netProfit: 35000,
  cashSales: 50000,
  qrisSales: 10000,
  debitSales: 0,
  grabSales: 5000,
  shopeeSales: 5000,
  openingCash: 100000,
  expectedCash: 140000,
  actualCash: 139000,
  cashDifference: -1000,
  notes: 'Kurang seribu',
  createdAt: '2026-08-03T15:00:00.000Z',
  updatedAt: '2026-08-03T15:00:00.000Z',
  createdBy: 'Staff Santara',
};

test('58 mm daily summary contains required audit details within 32 columns', () => {
  const text = buildDailySummaryText(report, closing, SANTARA_BUSINESS, {
    paperWidth: '58mm',
  });
  assert.ok(text.includes('Americano L x3'));
  assert.ok(text.includes('Es Batu x1 Pack'));
  assert.ok(text.includes('Saldo Awal'));
  assert.ok(text.includes('Expected Cash'));
  assert.ok(text.includes('Actual Cash'));
  assert.ok(text.includes('Grab'));
  assert.ok(text.includes('Shopee'));
  for (const line of text.trimEnd().split('\n')) {
    assert.ok(line.length <= 32, `${line.length}: ${line}`);
  }
});

test('daily summary ESC/POS bytes initialize and cut paper', () => {
  const bytes = buildDailySummaryPrintBytes(report, closing, SANTARA_BUSINESS, {
    paperWidth: '80mm',
    cutPaper: true,
  });
  assert.deepEqual(Array.from(bytes.slice(0, 2)), [0x1b, 0x40]);
  assert.deepEqual(Array.from(bytes.slice(-4)), [0x1d, 0x56, 0x42, 0x00]);
});
