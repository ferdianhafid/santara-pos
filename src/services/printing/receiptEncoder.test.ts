import assert from 'node:assert/strict';
import test from 'node:test';
import type { CompletedTransaction } from '../../types';
import {
  buildReceiptPrintBytes,
  buildReceiptText,
  getPaperColumns,
} from './receiptEncoder.ts';

const transaction: CompletedTransaction = {
  receiptNumber: 'PAR-20260801-001',
  dateTime: '2026-08-01T05:30:00.000Z',
  cashierName: 'Owner Parama',
  items: [
    {
      id: 'menu-1',
      nameSnapshot: 'Kopi Susu Gula Aren dengan Nama Menu Sangat Panjang',
      categorySnapshot: 'Coffee',
      unitPriceSnapshot: 22000,
      hppSnapshot: 8000,
      quantity: 2,
      itemDiscountType: 'fixed',
      itemDiscountValue: 2000,
      itemDiscountAmount: 2000,
      subtotal: 44000,
      grossLineTotal: 44000,
      lineNetTotal: 42000,
      unitHppSnapshot: 8000,
      totalHpp: 16000,
      profit: 26000,
    },
  ],
  subtotalBeforeDiscount: 44000,
  discountType: 'fixed',
  discountValue: 3000,
  discountAmount: 5000,
  itemDiscountAmount: 2000,
  transactionDiscountAmount: 3000,
  totalAfterDiscount: 39000,
  paymentMethod: 'Cash',
  paidAmount: 50000,
  changeAmount: 11000,
  status: 'completed',
  voidedAt: null,
  voidedBy: null,
  voidReason: null,
};

test('58 mm receipt respects 32 character content width', () => {
  const text = buildReceiptText(transaction, {
    businessName: 'Parama Cafe',
    paperWidth: '58mm',
    isReprint: true,
  });

  assert.equal(getPaperColumns('58mm'), 32);
  assert.ok(text.includes('PARAMA CAFE'));
  assert.ok(text.includes('*** CETAK ULANG ***'));
  assert.ok(text.includes('Diskon transaksi'));
  assert.ok(text.includes('Kembalian'));
  for (const line of text.trimEnd().split('\n')) {
    assert.ok(line.length <= 32, `${line.length}: ${line}`);
  }
});

test('80 mm receipt uses a wider 48 character profile', () => {
  const text = buildReceiptText(transaction, {
    businessName: 'Parama Cafe',
    paperWidth: '80mm',
  });

  assert.equal(getPaperColumns('80mm'), 48);
  assert.ok(text.split('\n').some((line) => line.length > 32));
  for (const line of text.trimEnd().split('\n')) {
    assert.ok(line.length <= 48, `${line.length}: ${line}`);
  }
});

test('ESC/POS payload initializes, feeds, and cuts', () => {
  const bytes = buildReceiptPrintBytes(transaction, {
    businessName: 'Parama Cafe',
    paperWidth: '58mm',
  });

  assert.deepEqual(Array.from(bytes.slice(0, 2)), [0x1b, 0x40]);
  assert.deepEqual(Array.from(bytes.slice(-4)), [0x1d, 0x56, 0x42, 0x00]);
});
