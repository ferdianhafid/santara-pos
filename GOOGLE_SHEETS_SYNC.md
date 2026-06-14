# Google Sheets Sync - Santara POS

Santara POS syncs reports to Google Sheets through a simple Google Apps Script
Web App URL.

This is intentionally simple:

* No Google OAuth inside Santara POS.
* No Google API client inside Santara POS.
* The app sends the selected report to your Apps Script endpoint.
* Apps Script writes readable Santara report sheets into Google Sheets.

## 1. Create the Google Sheet

1. Open Google Sheets.
2. Create a new spreadsheet.
3. Rename it, for example: `Santara POS Reports`.
4. Copy the spreadsheet ID from the URL.

Example URL:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
```

## 2. Create Apps Script

1. In the Google Sheet, open Extensions.
2. Click Apps Script.
3. Delete the starter code.
4. Paste the script below.
5. Replace `SPREADSHEET_ID_HERE` with your spreadsheet ID.
6. Save the script.

This script creates these visible sheets:

* `Laporan Penjualan`
* `Rekap Bulanan`
* `Rekap Keseluruhan`
* `Rekap Produk Bulanan`
* `Sync Logs`

It also creates hidden internal sheets:

* `_Data Rekap Internal`
* `_Data Produk Internal`

Those hidden sheets store one clean row per synced date/month and product. They
allow `Rekap Keseluruhan` to be recalculated after every sync, so syncing the
same date again replaces old data instead of double counting.

Quantity columns such as `Jumlah Terjual` are formatted as normal numbers, not
Rupiah. Currency formatting is only used for money columns, and margin columns
use percent formatting.

```js
const SPREADSHEET_ID = 'SPREADSHEET_ID_HERE';
const REPORT_SHEET_NAME = 'Laporan Penjualan';
const MONTHLY_SHEET_NAME = 'Rekap Bulanan';
const ALL_TIME_SHEET_NAME = 'Rekap Keseluruhan';
const PRODUCT_MONTHLY_SHEET_NAME = 'Rekap Produk Bulanan';
const SYNC_LOG_SHEET_NAME = 'Sync Logs';
const RAW_SUMMARY_SHEET_NAME = '_Data Rekap Internal';
const RAW_PRODUCT_SHEET_NAME = '_Data Produk Internal';
const START_MARKER = '__SANTARA_REPORT_START__';
const END_MARKER = '__SANTARA_REPORT_END__';
const BLUE_HEADER = '#d9eaf7';
const PINK_TOTAL = '#f8d7da';
const SOFT_GRAY = '#f7f7f7';
const TEXT_COLOR = '#1f2933';

const PRODUCT_HEADERS = [
  'No',
  'Nama Produk',
  'Harga Satuan',
  'Jumlah Terjual',
  'Pendapatan Kotor',
  'Diskon',
  'Pendapatan Bersih',
  'HPP',
  'Laba Kotor',
  'Margin',
];

const MONTHLY_HEADERS = [
  'Bulan',
  'Penjualan Kotor',
  'Total Diskon',
  'Penjualan Bersih',
  'Total HPP',
  'Laba Kotor',
  'Gross Margin',
  'Total Pengeluaran',
  'Laba Bersih',
  'Net Margin',
  'Cash Sales',
  'QRIS Sales',
  'Debit Sales',
  'Total Transaksi',
  'Average Transaction Value',
  'Last Sync',
];

const PRODUCT_MONTHLY_HEADERS = [
  'Bulan',
  'Nama Produk',
  'Kategori',
  'Jumlah Terjual',
  'Penjualan Kotor',
  'Diskon',
  'Penjualan Bersih',
  'HPP',
  'Laba Kotor',
  'Margin',
];

const ALL_TIME_HEADERS = ['Metric', 'Value'];

const SYNC_LOG_HEADERS = [
  'Synced At',
  'Report Key',
  'Report Mode',
  'Status',
  'Message',
];

const RAW_SUMMARY_HEADERS = [
  'Data Key',
  'Report Key',
  'Report Mode Slug',
  'Period Value',
  'Period Label',
  'Month Key',
  'Month Label',
  'Generated At',
  'Gross Sales',
  'Total Discount',
  'Net Sales',
  'Total HPP',
  'Gross Profit',
  'Total Expenses',
  'Net Profit',
  'Cash Sales',
  'QRIS Sales',
  'Debit Sales',
  'Total Transactions',
];

const RAW_PRODUCT_HEADERS = [
  'Data Key',
  'Report Key',
  'Month Key',
  'Month Label',
  'Product Name',
  'Category',
  'Quantity',
  'Gross Sales',
  'Discount',
  'Net Sales',
  'HPP',
  'Profit',
];

function doPost(e) {
  const syncedAt = new Date();
  let reportKey = 'unknown';
  let reportMode = 'Unknown';

  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const metadata = payload.metadata || {};
    const rawSummarySheet = setupRawSheet(spreadsheet, RAW_SUMMARY_SHEET_NAME, RAW_SUMMARY_HEADERS);
    const rawProductSheet = setupRawSheet(spreadsheet, RAW_PRODUCT_SHEET_NAME, RAW_PRODUCT_HEADERS);

    reportKey = metadata.reportKey || payload.summary?.reportKey || buildFallbackReportKey(metadata);
    reportMode = metadata.reportMode || 'Unknown';

    replaceReportBlock(setupReportSheet(spreadsheet), reportKey, payload);
    upsertRawSummary(rawSummarySheet, payload);
    replaceRawProducts(rawProductSheet, payload);
    rebuildMonthlySummary(setupTableSheet(spreadsheet, MONTHLY_SHEET_NAME, MONTHLY_HEADERS), rawSummarySheet);
    rebuildProductMonthlySummary(setupTableSheet(spreadsheet, PRODUCT_MONTHLY_SHEET_NAME, PRODUCT_MONTHLY_HEADERS), rawProductSheet);
    rebuildAllTimeSummary(setupTableSheet(spreadsheet, ALL_TIME_SHEET_NAME, ALL_TIME_HEADERS), rawSummarySheet);
    appendSyncLog(setupSyncLogSheet(spreadsheet), syncedAt, reportKey, reportMode, 'success', 'Sync berhasil');

    return jsonResponse({ ok: true, message: 'Data berhasil dikirim ke Google Sheets.' });
  } catch (error) {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const syncLogSheet = setupSyncLogSheet(spreadsheet);
    const message = String(error);

    appendSyncLog(syncLogSheet, syncedAt, reportKey, reportMode, 'error', message);

    return jsonResponse({ ok: false, message });
  }
}

function setupReportSheet(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(REPORT_SHEET_NAME) || spreadsheet.insertSheet(REPORT_SHEET_NAME);

  sheet.getRange(1, 1, 1, PRODUCT_HEADERS.length)
    .breakApart()
    .merge()
    .setValue('Santara Coffee - Laporan Penjualan')
    .setFontWeight('bold')
    .setFontSize(14)
    .setFontColor(TEXT_COLOR)
    .setBackground(BLUE_HEADER)
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  return sheet;
}

function setupTableSheet(spreadsheet, sheetName, headers) {
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);

  sheet.getRange(1, 1, 1, headers.length)
    .breakApart()
    .merge()
    .setValue(`Santara Coffee - ${sheetName}`)
    .setFontWeight('bold')
    .setFontSize(13)
    .setFontColor(TEXT_COLOR)
    .setBackground(BLUE_HEADER)
    .setHorizontalAlignment('center');
  sheet.getRange(2, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground(BLUE_HEADER)
    .setFontColor(TEXT_COLOR)
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true);
  sheet.setFrozenRows(2);

  return sheet;
}

function setupRawSheet(spreadsheet, sheetName, headers) {
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.hideSheet();

  return sheet;
}

function setupSyncLogSheet(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SYNC_LOG_SHEET_NAME) || spreadsheet.insertSheet(SYNC_LOG_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, SYNC_LOG_HEADERS.length).setValues([SYNC_LOG_HEADERS]);
  }

  sheet.getRange(1, 1, 1, SYNC_LOG_HEADERS.length)
    .setFontWeight('bold')
    .setBackground(BLUE_HEADER)
    .setFontColor(TEXT_COLOR);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, SYNC_LOG_HEADERS.length);

  return sheet;
}

function replaceReportBlock(sheet, reportKey, payload) {
  deleteExistingReportBlock(sheet, reportKey);

  const metadata = payload.metadata || {};
  const summary = payload.summary || {};
  const menuSales = payload.menuSales || [];
  const paymentSummary = payload.paymentSummary || [];
  const expenseSummary = payload.expenseSummary || [];
  const dailyClosing = payload.dailyClosing || null;
  const periodLabel = metadata.periodLabel || summary.periodLabel || metadata.selectedDate || 'Periode laporan';
  const generatedAt = metadata.generatedAt || new Date();
  const startRow = Math.max(sheet.getLastRow() + 2, 3);
  const rows = [];

  rows.push(padRow([`${START_MARKER}:${reportKey}`]));
  rows.push(padRow([periodLabel]));
  rows.push(padRow([`Dibuat: ${formatDateTime(generatedAt)}`]));
  rows.push(padRow([]));
  rows.push(PRODUCT_HEADERS);

  if (menuSales.length === 0) {
    rows.push(padRow(['-', 'Belum ada penjualan menu', '', '', 0, 0, 0, 0, 0, 0]));
  } else {
    menuSales.forEach((item, index) => {
      rows.push([
        index + 1,
        item.name || '',
        toNumber(item.unitPrice),
        toNumber(item.quantity),
        toNumber(item.grossSales),
        toNumber(item.discountAmount),
        toNumber(item.netSales),
        toNumber(item.hpp),
        toNumber(item.estimatedProfit),
        toPercent(item.margin),
      ]);
    });
  }

  const totalGrossProfit = toNumber(summary.netSales) - toNumber(summary.totalHpp);
  const totalMargin = toNumber(summary.netSales) > 0 ? totalGrossProfit / toNumber(summary.netSales) : 0;
  const totalRowIndexInRows = rows.length;

  rows.push([
    '',
    'TOTAL',
    '',
    menuSales.reduce((total, item) => total + toNumber(item.quantity), 0),
    toNumber(summary.grossSales),
    toNumber(summary.totalDiscount),
    toNumber(summary.netSales),
    toNumber(summary.totalHpp),
    totalGrossProfit,
    totalMargin,
  ]);

  rows.push(padRow([]));
  rows.push(padRow(['Ringkasan Pembayaran']));
  ['Cash', 'QRIS', 'Debit'].forEach((method) => {
    const payment = paymentSummary.find((item) => item.method === method) || {};
    rows.push(padRow([method, toNumber(payment.total), `${toNumber(payment.transactionCount)} transaksi`]));
  });

  rows.push(padRow([]));
  rows.push(padRow(['Ringkasan Diskon']));
  rows.push(padRow(['Total diskon', toNumber(summary.totalDiscount)]));
  rows.push(padRow(['Transaksi berdiskon', `${toNumber(payload.discountSummary?.discountedTransactionCount)} transaksi`]));

  rows.push(padRow([]));
  rows.push(padRow(['Ringkasan Pengeluaran']));
  rows.push(padRow(['Total pengeluaran', toNumber(summary.totalExpenses)]));
  if (expenseSummary.length === 0) {
    rows.push(padRow(['Kategori', '-']));
  } else {
    expenseSummary.forEach((expense) => {
      rows.push(padRow([expense.category || 'Lainnya', toNumber(expense.total)]));
    });
  }

  rows.push(padRow([]));
  rows.push(padRow(['Closing Harian']));
  rows.push(padRow(['Kas seharusnya', dailyClosing ? toNumber(dailyClosing.expectedCash) : 0]));
  rows.push(padRow(['Kas aktual', dailyClosing ? toNumber(dailyClosing.actualCash) : 0]));
  rows.push(padRow(['Selisih kas', dailyClosing ? toNumber(dailyClosing.cashDifference) : 0]));
  rows.push(padRow(['Catatan', dailyClosing?.notes || '-']));
  rows.push(padRow([`${END_MARKER}:${reportKey}`]));

  sheet.getRange(startRow, 1, rows.length, PRODUCT_HEADERS.length).setValues(rows);
  formatReportBlock(sheet, startRow, rows.length, totalRowIndexInRows);
}

function formatReportBlock(sheet, startRow, rowCount, totalRowIndexInRows) {
  const titleRow = startRow + 1;
  const generatedRow = startRow + 2;
  const headerRow = startRow + 4;
  const totalRow = startRow + totalRowIndexInRows;
  const endRow = startRow + rowCount - 1;
  const tableBodyHeight = totalRow - headerRow;

  sheet.hideRows(startRow);
  sheet.hideRows(endRow);

  sheet.getRange(titleRow, 1, 1, PRODUCT_HEADERS.length)
    .breakApart()
    .merge()
    .setFontWeight('bold')
    .setFontSize(13)
    .setBackground(BLUE_HEADER)
    .setFontColor(TEXT_COLOR)
    .setHorizontalAlignment('center');

  sheet.getRange(generatedRow, 1, 1, PRODUCT_HEADERS.length)
    .breakApart()
    .merge()
    .setFontStyle('italic')
    .setFontColor('#5f6b7a');

  sheet.getRange(headerRow, 1, 1, PRODUCT_HEADERS.length)
    .setFontWeight('bold')
    .setBackground(BLUE_HEADER)
    .setHorizontalAlignment('center');

  sheet.getRange(headerRow, 1, tableBodyHeight + 1, PRODUCT_HEADERS.length)
    .setBorder(true, true, true, true, true, true);

  sheet.getRange(totalRow, 1, 1, PRODUCT_HEADERS.length)
    .setFontWeight('bold')
    .setBackground(PINK_TOTAL);

  sheet.getRange(headerRow + 1, 1, tableBodyHeight, 1).setHorizontalAlignment('center');
  sheet.getRange(headerRow + 1, 3, tableBodyHeight, 1).setNumberFormat('"Rp" #,##0').setHorizontalAlignment('right');
  sheet.getRange(headerRow + 1, 4, tableBodyHeight, 1).setNumberFormat('#,##0').setHorizontalAlignment('center');
  sheet.getRange(headerRow + 1, 5, tableBodyHeight, 5).setNumberFormat('"Rp" #,##0').setHorizontalAlignment('right');
  sheet.getRange(headerRow + 1, 10, tableBodyHeight, 1).setNumberFormat('0.00%').setHorizontalAlignment('right');

  formatSectionTitles(sheet, startRow, rowCount);
  formatSummaryCurrency(sheet, startRow, rowCount);

  sheet.autoResizeColumns(1, PRODUCT_HEADERS.length);
}

function upsertRawSummary(sheet, payload) {
  const metadata = payload.metadata || {};
  const summary = payload.summary || {};
  const dataKey = getDataKey(metadata, summary);
  const row = [
    dataKey,
    metadata.reportKey || summary.reportKey || dataKey,
    metadata.reportModeSlug || '',
    metadata.periodValue || summary.periodValue || '',
    metadata.periodLabel || summary.periodLabel || '',
    metadata.monthKey || summary.monthKey || '',
    metadata.monthLabel || summary.monthLabel || '',
    metadata.generatedAt || new Date(),
    toNumber(summary.grossSales),
    toNumber(summary.totalDiscount),
    toNumber(summary.netSales),
    toNumber(summary.totalHpp),
    toNumber(summary.grossProfit),
    toNumber(summary.totalExpenses),
    toNumber(summary.netProfit),
    toNumber(summary.cashSales),
    toNumber(summary.qrisSales),
    toNumber(summary.debitSales),
    toNumber(summary.totalTransactions),
  ];

  upsertRowByFirstColumn(sheet, dataKey, row, RAW_SUMMARY_HEADERS.length, 2);
}

function replaceRawProducts(sheet, payload) {
  const metadata = payload.metadata || {};
  const summary = payload.summary || {};
  const dataKey = getDataKey(metadata, summary);

  deleteRowsByFirstColumn(sheet, dataKey, 2);

  const rows = (payload.menuSales || []).map((item) => [
    dataKey,
    metadata.reportKey || summary.reportKey || dataKey,
    metadata.monthKey || summary.monthKey || '',
    metadata.monthLabel || summary.monthLabel || '',
    item.name || '',
    item.category || '',
    toNumber(item.quantity),
    toNumber(item.grossSales),
    toNumber(item.discountAmount),
    toNumber(item.netSales),
    toNumber(item.hpp),
    toNumber(item.estimatedProfit),
  ]);

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, RAW_PRODUCT_HEADERS.length).setValues(rows);
  }
}

function rebuildMonthlySummary(sheet, rawSummarySheet) {
  const rollups = getMonthlyRollups(rawSummarySheet);

  clearDataRows(sheet, MONTHLY_HEADERS.length);

  if (rollups.length === 0) {
    return;
  }

  const rows = rollups.map((rollup) => [
    rollup.monthLabel,
    rollup.grossSales,
    rollup.totalDiscount,
    rollup.netSales,
    rollup.totalHpp,
    rollup.grossProfit,
    safeDivide(rollup.grossProfit, rollup.netSales),
    rollup.totalExpenses,
    rollup.netProfit,
    safeDivide(rollup.netProfit, rollup.netSales),
    rollup.cashSales,
    rollup.qrisSales,
    rollup.debitSales,
    rollup.totalTransactions,
    safeDivide(rollup.netSales, rollup.totalTransactions),
    formatDateTime(rollup.generatedAt),
  ]);

  sheet.getRange(3, 1, rows.length, MONTHLY_HEADERS.length).setValues(rows);
  formatMonthlySheet(sheet);
}

function rebuildProductMonthlySummary(sheet, rawProductSheet) {
  const productRows = getRawProductRows(rawProductSheet);
  const monthHasOverride = new Set(
    productRows
      .filter((row) => row.dataKey.startsWith('month:'))
      .map((row) => row.monthKey),
  );
  const productMap = new Map();

  productRows
    .filter((row) => row.monthKey)
    .filter((row) => {
      if (row.dataKey.startsWith('month:')) {
        return true;
      }

      return !monthHasOverride.has(row.monthKey);
    })
    .forEach((row) => {
      const key = `${row.monthKey}|${row.productName}`;
      const current = productMap.get(key) || createProductRollup(row);

      current.quantity += row.quantity;
      current.grossSales += row.grossSales;
      current.discount += row.discount;
      current.netSales += row.netSales;
      current.hpp += row.hpp;
      current.profit += row.profit;
      productMap.set(key, current);
    });

  const rows = Array.from(productMap.values())
    .sort((first, second) => first.monthKey.localeCompare(second.monthKey) || second.quantity - first.quantity)
    .map((rollup) => [
      rollup.monthLabel,
      rollup.productName,
      rollup.category,
      rollup.quantity,
      rollup.grossSales,
      rollup.discount,
      rollup.netSales,
      rollup.hpp,
      rollup.profit,
      safeDivide(rollup.profit, rollup.netSales),
    ]);

  clearDataRows(sheet, PRODUCT_MONTHLY_HEADERS.length);

  if (rows.length > 0) {
    sheet.getRange(3, 1, rows.length, PRODUCT_MONTHLY_HEADERS.length).setValues(rows);
  }

  formatProductMonthlySheet(sheet);
}

function rebuildAllTimeSummary(sheet, rawSummarySheet) {
  const rollups = getAllTimeSourceRollups(rawSummarySheet);
  const totals = rollups.reduce((total, rollup) => addSummaryTotals(total, rollup), createEmptySummary());
  const lastSync = rollups.reduce((latest, rollup) => {
    const latestTime = new Date(latest).getTime();
    const nextTime = new Date(rollup.generatedAt).getTime();

    return nextTime > latestTime ? rollup.generatedAt : latest;
  }, '');
  const rows = [
    ['Penjualan Kotor', totals.grossSales],
    ['Total Diskon', totals.totalDiscount],
    ['Penjualan Bersih', totals.netSales],
    ['Total HPP', totals.totalHpp],
    ['Laba Kotor', totals.grossProfit],
    ['Gross Margin', safeDivide(totals.grossProfit, totals.netSales)],
    ['Total Pengeluaran', totals.totalExpenses],
    ['Laba Bersih', totals.netProfit],
    ['Net Margin', safeDivide(totals.netProfit, totals.netSales)],
    ['Cash Sales', totals.cashSales],
    ['QRIS Sales', totals.qrisSales],
    ['Debit Sales', totals.debitSales],
    ['Total Transaksi', totals.totalTransactions],
    ['Average Transaction Value', safeDivide(totals.netSales, totals.totalTransactions)],
    ['Last Sync', lastSync ? formatDateTime(lastSync) : '-'],
  ];

  clearDataRows(sheet, ALL_TIME_HEADERS.length);
  sheet.getRange(3, 1, rows.length, ALL_TIME_HEADERS.length).setValues(rows);
  formatAllTimeSheet(sheet, rows);
}

function getAllTimeSourceRollups(rawSummarySheet) {
  const monthlyRollups = getMonthlyRollups(rawSummarySheet);

  if (monthlyRollups.length > 0) {
    return monthlyRollups;
  }

  return getRawSummaryRows(rawSummarySheet).filter((row) => row.modeSlug === 'semua-waktu');
}

function getMonthlyRollups(rawSummarySheet) {
  const rows = getRawSummaryRows(rawSummarySheet).filter((row) => row.modeSlug !== 'semua-waktu');
  const monthOverrideKeys = new Set(
    rows
      .filter((row) => row.dataKey.startsWith('month:'))
      .map((row) => row.monthKey),
  );
  const monthMap = new Map();

  rows
    .filter((row) => row.monthKey)
    .filter((row) => {
      if (row.dataKey.startsWith('month:')) {
        return true;
      }

      return !monthOverrideKeys.has(row.monthKey);
    })
    .forEach((row) => {
      const current = monthMap.get(row.monthKey) || createMonthRollup(row);
      monthMap.set(row.monthKey, addSummaryTotals(current, row));
    });

  return Array.from(monthMap.values()).sort((first, second) => first.monthKey.localeCompare(second.monthKey));
}

function getRawSummaryRows(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet.getRange(2, 1, lastRow - 1, RAW_SUMMARY_HEADERS.length).getValues().map((row) => ({
    dataKey: String(row[0] || ''),
    reportKey: String(row[1] || ''),
    modeSlug: String(row[2] || ''),
    periodValue: String(row[3] || ''),
    periodLabel: String(row[4] || ''),
    monthKey: String(row[5] || ''),
    monthLabel: String(row[6] || ''),
    generatedAt: row[7],
    grossSales: toNumber(row[8]),
    totalDiscount: toNumber(row[9]),
    netSales: toNumber(row[10]),
    totalHpp: toNumber(row[11]),
    grossProfit: toNumber(row[12]),
    totalExpenses: toNumber(row[13]),
    netProfit: toNumber(row[14]),
    cashSales: toNumber(row[15]),
    qrisSales: toNumber(row[16]),
    debitSales: toNumber(row[17]),
    totalTransactions: toNumber(row[18]),
  }));
}

function getRawProductRows(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet.getRange(2, 1, lastRow - 1, RAW_PRODUCT_HEADERS.length).getValues().map((row) => ({
    dataKey: String(row[0] || ''),
    reportKey: String(row[1] || ''),
    monthKey: String(row[2] || ''),
    monthLabel: String(row[3] || ''),
    productName: String(row[4] || ''),
    category: String(row[5] || ''),
    quantity: toNumber(row[6]),
    grossSales: toNumber(row[7]),
    discount: toNumber(row[8]),
    netSales: toNumber(row[9]),
    hpp: toNumber(row[10]),
    profit: toNumber(row[11]),
  }));
}

function createMonthRollup(row) {
  return {
    ...createEmptySummary(),
    monthKey: row.monthKey,
    monthLabel: row.monthLabel || formatMonthLabel(row.monthKey),
    generatedAt: row.generatedAt,
  };
}

function createProductRollup(row) {
  return {
    monthKey: row.monthKey,
    monthLabel: row.monthLabel || formatMonthLabel(row.monthKey),
    productName: row.productName,
    category: row.category,
    quantity: 0,
    grossSales: 0,
    discount: 0,
    netSales: 0,
    hpp: 0,
    profit: 0,
  };
}

function createEmptySummary() {
  return {
    grossSales: 0,
    totalDiscount: 0,
    netSales: 0,
    totalHpp: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    cashSales: 0,
    qrisSales: 0,
    debitSales: 0,
    totalTransactions: 0,
  };
}

function addSummaryTotals(total, row) {
  total.grossSales += row.grossSales;
  total.totalDiscount += row.totalDiscount;
  total.netSales += row.netSales;
  total.totalHpp += row.totalHpp;
  total.grossProfit += row.grossProfit;
  total.totalExpenses += row.totalExpenses;
  total.netProfit += row.netProfit;
  total.cashSales += row.cashSales;
  total.qrisSales += row.qrisSales;
  total.debitSales += row.debitSales;
  total.totalTransactions += row.totalTransactions;

  if (row.generatedAt) {
    const currentTime = new Date(total.generatedAt || 0).getTime();
    const rowTime = new Date(row.generatedAt).getTime();

    if (rowTime > currentTime) {
      total.generatedAt = row.generatedAt;
    }
  }

  return total;
}

function upsertRowByFirstColumn(sheet, key, row, columnCount, headerRows) {
  const rowNumber = findRowByFirstColumn(sheet, key, headerRows);

  if (rowNumber) {
    sheet.getRange(rowNumber, 1, 1, columnCount).setValues([row]);
    return;
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, columnCount).setValues([row]);
}

function findRowByFirstColumn(sheet, key, headerRows) {
  const lastRow = sheet.getLastRow();

  if (lastRow < headerRows) {
    return null;
  }

  const values = sheet.getRange(headerRows, 1, lastRow - headerRows + 1, 1).getValues();

  for (let index = 0; index < values.length; index += 1) {
    if (values[index][0] === key) {
      return index + headerRows;
    }
  }

  return null;
}

function deleteRowsByFirstColumn(sheet, key, headerRows) {
  const lastRow = sheet.getLastRow();

  if (lastRow < headerRows) {
    return;
  }

  const values = sheet.getRange(headerRows, 1, lastRow - headerRows + 1, 1).getValues();

  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index][0] === key) {
      sheet.deleteRow(index + headerRows);
    }
  }
}

function formatMonthlySheet(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 3) {
    return;
  }

  sheet.getRange(2, 1, lastRow - 1, MONTHLY_HEADERS.length)
    .setBorder(true, true, true, true, true, true);
  sheet.getRange(3, 2, lastRow - 2, 5).setNumberFormat('"Rp" #,##0');
  sheet.getRange(3, 7, lastRow - 2, 1).setNumberFormat('0.00%');
  sheet.getRange(3, 8, lastRow - 2, 2).setNumberFormat('"Rp" #,##0');
  sheet.getRange(3, 10, lastRow - 2, 1).setNumberFormat('0.00%');
  sheet.getRange(3, 11, lastRow - 2, 3).setNumberFormat('"Rp" #,##0');
  sheet.getRange(3, 14, lastRow - 2, 1).setNumberFormat('#,##0');
  sheet.getRange(3, 15, lastRow - 2, 1).setNumberFormat('"Rp" #,##0');
  sheet.autoResizeColumns(1, MONTHLY_HEADERS.length);
}

function formatProductMonthlySheet(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 3) {
    return;
  }

  sheet.getRange(2, 1, lastRow - 1, PRODUCT_MONTHLY_HEADERS.length)
    .setBorder(true, true, true, true, true, true);
  sheet.getRange(3, 4, lastRow - 2, 1).setNumberFormat('#,##0').setHorizontalAlignment('center');
  sheet.getRange(3, 5, lastRow - 2, 5).setNumberFormat('"Rp" #,##0');
  sheet.getRange(3, 10, lastRow - 2, 1).setNumberFormat('0.00%');
  sheet.autoResizeColumns(1, PRODUCT_MONTHLY_HEADERS.length);
}

function formatAllTimeSheet(sheet, rows) {
  sheet.getRange(2, 1, rows.length + 1, ALL_TIME_HEADERS.length)
    .setBorder(true, true, true, true, true, true);
  rows.forEach((row, index) => {
    const metric = row[0];
    const valueCell = sheet.getRange(index + 3, 2);

    if (metric.includes('Margin')) {
      valueCell.setNumberFormat('0.00%');
      return;
    }

    if (metric.includes('Transaksi')) {
      valueCell.setNumberFormat('#,##0');
      return;
    }

    if (metric !== 'Last Sync') {
      valueCell.setNumberFormat('"Rp" #,##0');
    }
  });
  sheet.getRange(rows.length + 2, 1, 1, ALL_TIME_HEADERS.length).setBackground(PINK_TOTAL).setFontWeight('bold');
  sheet.autoResizeColumns(1, ALL_TIME_HEADERS.length);
}

function clearDataRows(sheet, columnCount) {
  const lastRow = sheet.getLastRow();

  if (lastRow >= 3) {
    sheet.getRange(3, 1, lastRow - 2, columnCount).clearContent().clearFormat();
  }
}

function formatSectionTitles(sheet, startRow, rowCount) {
  const values = sheet.getRange(startRow, 1, rowCount, 1).getValues();
  const titles = [
    'Ringkasan Pembayaran',
    'Ringkasan Diskon',
    'Ringkasan Pengeluaran',
    'Closing Harian',
  ];

  values.forEach((row, index) => {
    if (titles.includes(row[0])) {
      sheet.getRange(startRow + index, 1, 1, 3)
        .setFontWeight('bold')
        .setBackground(SOFT_GRAY)
        .setBorder(true, true, true, true, false, false);
    }
  });
}

function formatSummaryCurrency(sheet, startRow, rowCount) {
  sheet.getRange(startRow, 2, rowCount, 1).setNumberFormat('"Rp" #,##0');
}

function deleteExistingReportBlock(sheet, reportKey) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  const values = sheet.getRange(1, 1, lastRow, 1).getValues().map((row) => String(row[0]));
  const startMarker = `${START_MARKER}:${reportKey}`;
  const endMarker = `${END_MARKER}:${reportKey}`;
  const startIndex = values.indexOf(startMarker);
  const endIndex = values.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return;
  }

  sheet.deleteRows(startIndex + 1, endIndex - startIndex + 1);
}

function appendSyncLog(sheet, syncedAt, reportKey, reportMode, status, message) {
  sheet.appendRow([syncedAt, reportKey, reportMode, status, message]);
  sheet.autoResizeColumns(1, SYNC_LOG_HEADERS.length);
}

function padRow(values) {
  const row = values.slice(0, PRODUCT_HEADERS.length);

  while (row.length < PRODUCT_HEADERS.length) {
    row.push('');
  }

  return row;
}

function getDataKey(metadata, summary) {
  const modeSlug = metadata.reportModeSlug || '';
  const periodValue = metadata.periodValue || summary.periodValue || metadata.selectedDate || '';

  if (modeSlug === 'semua-waktu') {
    return 'all:semua-waktu';
  }

  if (modeSlug === 'bulan-ini') {
    return `month:${periodValue}`;
  }

  return `date:${periodValue}`;
}

function buildFallbackReportKey(metadata) {
  const mode = metadata.reportModeSlug || metadata.reportMode || 'report';
  const date = metadata.periodValue || metadata.selectedDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  return `${String(mode).toLowerCase().replace(/\s+/g, '-')}-${date}`;
}

function formatMonthLabel(monthKey) {
  const parts = String(monthKey).split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);

  if (!year || !month) {
    return String(monthKey);
  }

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  return `${monthNames[month - 1] || month} ${year}`;
}

function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || '-');
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd MMMM yyyy HH:mm');
}

function toNumber(value) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toPercent(value) {
  return toNumber(value) / 100;
}

function safeDivide(numerator, denominator) {
  const safeNumerator = toNumber(numerator);
  const safeDenominator = toNumber(denominator);

  return safeDenominator > 0 ? safeNumerator / safeDenominator : 0;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Deploy as Web App

1. Click Deploy.
2. Choose New deployment.
3. Select Web app.
4. Set Execute as: `Me`.
5. Set Who has access: `Anyone`.
6. Click Deploy.
7. Copy the Web App URL.

The URL should look like:

```text
https://script.google.com/macros/s/.../exec
```

## 4. Save the URL in Santara POS

1. Open Santara POS.
2. Login as owner or admin.
3. Open `Laporan`.
4. Paste the Apps Script URL into `URL Apps Script`.
5. Click `Simpan URL`.
6. Click `Sync Google Sheet`.

## 5. How Sync Updates the Sheets

Santara POS sends an internal `Report Key`, but the key is hidden in the main
report sheet. The visible report uses a readable label such as:

* `Tanggal: 14 Juni 2026`
* `Periode: Juni 2026`
* `Periode: Semua Waktu`

The script updates these sheets:

* `Laporan Penjualan`: replaces the old block for the same date or period.
* `Rekap Bulanan`: recalculates monthly rows from stored synced data.
* `Rekap Produk Bulanan`: recalculates product rows from stored synced data.
* `Rekap Keseluruhan`: recalculates automatically after every successful sync.
* `Sync Logs`: appends every sync attempt for troubleshooting.

You do not need to sync `Semua Waktu` just to update `Rekap Keseluruhan`.
Syncing daily or monthly reports is enough because the script stores each synced
date/month once, then recalculates all-time totals from those stored rows.

If you sync the same date again, the hidden stored row for that date is updated,
not duplicated. That means corrections, voids, or deleted receipts can increase
or decrease the all-time totals correctly after you sync the corrected date.

## 6. Test Safely

Use `Hari Ini` first with a small test report.

Check:

* `Laporan Penjualan` has a readable report block.
* `Jumlah Terjual` is a plain number, not Rupiah.
* The product table has blue headers and a pink total row.
* Payment, discount, expenses, and closing summaries appear below the product table.
* `Rekap Bulanan` has one row for the month.
* `Rekap Produk Bulanan` has product rows for the month.
* `Rekap Keseluruhan` updates after the daily sync.
* `Sync Logs` records the sync attempt.

Then click `Sync Google Sheet` again for the same period. The old report block,
matching summary rows, and all-time totals should update without double counting.

If sync fails, Santara POS still keeps data locally. Check that the Apps Script
deployment is active and that the URL ends with `/exec`.
