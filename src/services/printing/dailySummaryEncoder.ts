import type { BusinessIdentity } from '../../config/businesses';
import type { DailyClosing, Expense } from '../../types';
import type { SalesReport } from '../../utils/reports';
import type { ThermalPaperWidth } from './receiptEncoder';

export type DailySummaryEncodingOptions = {
  paperWidth: ThermalPaperWidth;
  cutPaper?: boolean;
};

const paperColumns: Record<ThermalPaperWidth, number> = {
  '58mm': 32,
  '80mm': 48,
};

export function buildDailySummaryText(
  report: SalesReport,
  closing: DailyClosing,
  business: BusinessIdentity,
  options: DailySummaryEncodingOptions,
) {
  const width = paperColumns[options.paperWidth];
  const divider = '-'.repeat(width);
  const strongDivider = '='.repeat(width);
  const lines: string[] = [
    center(business.name.toUpperCase(), width),
    center('DAILY SUMMARY', width),
    center(formatClosingDate(closing.closingDate), width),
    divider,
    ...wrapText(`Kasir: ${closing.cashierName}`, width),
    `Transaksi: ${report.totalTransactions}`,
    divider,
    'MENU TERJUAL',
  ];

  if (report.menuSales.length === 0) {
    lines.push('- Tidak ada penjualan');
  } else {
    report.menuSales.forEach((item) => {
      pushAmountLine(lines, `${item.name} x${formatQuantity(item.quantity)}`, item.netSales, width);
    });
  }

  lines.push(divider, 'PENJUALAN');
  pushAmountLine(lines, 'Kotor', closing.grossSales, width);
  pushAmountLine(lines, 'Diskon', -closing.totalDiscount, width);
  pushAmountLine(lines, 'Bersih', closing.netSales, width);
  pushAmountLine(lines, 'HPP', closing.totalHpp, width);
  pushAmountLine(lines, 'Laba Kotor', closing.grossProfit, width);

  lines.push(divider, 'METODE PEMBAYARAN');
  pushAmountLine(lines, 'Cash', closing.cashSales, width);
  pushAmountLine(lines, 'QRIS', closing.qrisSales, width);
  pushAmountLine(lines, 'Debit', closing.debitSales, width);
  pushAmountLine(lines, 'Grab', closing.grabSales, width);
  pushAmountLine(lines, 'Shopee', closing.shopeeSales, width);

  lines.push(divider, 'PENGELUARAN');
  if (report.expenses.length === 0) {
    lines.push('- Tidak ada pengeluaran');
  } else {
    report.expenses.forEach((expense) => {
      pushAmountLine(lines, formatExpenseLabel(expense), expense.amount, width);
    });
  }
  pushAmountLine(lines, 'Total Pengeluaran', closing.totalExpenses, width);

  lines.push(strongDivider, 'REKONSILIASI KAS');
  pushAmountLine(lines, 'Saldo Awal', closing.openingCash, width);
  pushAmountLine(lines, 'Penjualan Cash', closing.cashSales, width);
  pushAmountLine(lines, 'Pengeluaran Cash', -getCashExpenses(report), width);
  pushAmountLine(lines, 'Expected Cash', closing.expectedCash, width);
  pushAmountLine(lines, 'Actual Cash', closing.actualCash, width);
  pushAmountLine(lines, 'Selisih', closing.cashDifference, width);
  lines.push(strongDivider);
  pushAmountLine(lines, 'Laba Bersih', closing.netProfit, width);

  if (closing.notes.trim()) {
    lines.push(divider, 'CATATAN');
    lines.push(...wrapText(closing.notes.trim(), width));
  }

  lines.push('', center('Dicetak dari Cafe POS', width), '', '', '');
  return lines.join('\n');
}

export function buildDailySummaryPrintBytes(
  report: SalesReport,
  closing: DailyClosing,
  business: BusinessIdentity,
  options: DailySummaryEncodingOptions,
) {
  const text = new TextEncoder().encode(
    buildDailySummaryText(report, closing, business, options),
  );
  const cut = options.cutPaper
    ? new Uint8Array([0x1d, 0x56, 0x42, 0x00])
    : new Uint8Array();
  const bytes = new Uint8Array(2 + text.length + cut.length);
  bytes.set([0x1b, 0x40], 0);
  bytes.set(text, 2);
  bytes.set(cut, 2 + text.length);
  return bytes;
}

export function printDailySummaryInBrowser(
  report: SalesReport,
  closing: DailyClosing,
  business: BusinessIdentity,
) {
  const popup = window.open('', '_blank', 'popup,width=520,height=760');
  if (!popup) {
    throw new Error('Izinkan pop-up browser untuk membuka preview daily summary.');
  }

  const text = buildDailySummaryText(report, closing, business, {
    paperWidth: '80mm',
  });
  popup.document.title = `Daily Summary ${closing.closingDate}`;
  popup.document.body.innerHTML = '';
  const style = popup.document.createElement('style');
  style.textContent =
    'body{margin:0;padding:18px;background:#eee}pre{box-sizing:border-box;width:80mm;min-height:100mm;margin:auto;padding:8mm 6mm;background:#fff;color:#000;font:12px/1.35 monospace;white-space:pre-wrap}@media print{body{padding:0;background:#fff}pre{padding:4mm;margin:0}}';
  const pre = popup.document.createElement('pre');
  pre.textContent = text;
  popup.document.head.append(style);
  popup.document.body.append(pre);
  popup.focus();
  window.setTimeout(() => popup.print(), 250);
}

function pushAmountLine(
  lines: string[],
  label: string,
  amount: number,
  width: number,
) {
  const money = formatMoney(amount);
  const labelWidth = Math.max(width - money.length - 1, 8);
  const wrapped = wrapText(label, labelWidth);
  wrapped.forEach((line, index) => {
    lines.push(
      index === wrapped.length - 1
        ? `${line}${' '.repeat(Math.max(width - line.length - money.length, 1))}${money}`
        : line,
    );
  });
}

function formatExpenseLabel(expense: Expense) {
  if (!expense.quantity) {
    return expense.name;
  }
  const unit = expense.unit?.trim() ? ` ${expense.unit.trim()}` : '';
  return `${expense.name} x${formatQuantity(expense.quantity)}${unit}`;
}

function getCashExpenses(report: SalesReport) {
  return report.expenses
    .filter((expense) => expense.paymentMethod === 'Cash')
    .reduce((total, expense) => total + expense.amount, 0);
}

function formatMoney(value: number) {
  const prefix = value < 0 ? '-' : '';
  return `${prefix}${Math.abs(Math.round(value)).toLocaleString('id-ID')}`;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('id-ID');
}

function formatClosingDate(dateInput: string) {
  const date = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateInput;
  }
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function center(value: string, width: number) {
  const text = value.slice(0, width);
  return `${' '.repeat(Math.max(Math.floor((width - text.length) / 2), 0))}${text}`;
}

function wrapText(value: string, width: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    if (word.length > width) {
      if (current) lines.push(current);
      for (let index = 0; index < word.length; index += width) {
        lines.push(word.slice(index, index + width));
      }
      current = '';
      return;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}
