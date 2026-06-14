# Google Sheets Sync - Santara POS

Santara POS syncs reports to Google Sheets through a simple Google Apps Script
Web App URL.

This is intentionally simple:

* No Google OAuth inside Santara POS.
* No Google API client inside Santara POS.
* The app sends the selected report to your Apps Script endpoint.
* Apps Script writes a readable cafe sales report into Google Sheets.

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

This script creates a main sheet named `Laporan Penjualan`.

Each sync writes a readable report block with:

* report title by date or period;
* product sales table;
* total row;
* payment summary;
* discount summary;
* expense summary;
* daily closing summary.

If the same date or period is synced again, the old block is replaced instead
of duplicated.

```js
const SPREADSHEET_ID = 'SPREADSHEET_ID_HERE';
const REPORT_SHEET_NAME = 'Laporan Penjualan';
const SYNC_LOG_SHEET_NAME = 'Sync Logs';
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

const SYNC_LOG_HEADERS = [
  'Synced At',
  'Report Key',
  'Report Mode',
  'Status',
  'Message',
];

function doPost(e) {
  const syncedAt = new Date();
  let reportKey = 'unknown';
  let reportMode = 'Unknown';

  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const metadata = payload.metadata || {};

    reportKey = metadata.reportKey || payload.summary?.reportKey || buildFallbackReportKey(metadata);
    reportMode = metadata.reportMode || 'Unknown';

    const reportSheet = setupReportSheet(spreadsheet);
    const syncLogSheet = setupSyncLogSheet(spreadsheet);

    replaceReportBlock(reportSheet, reportKey, payload);
    appendSyncLog(syncLogSheet, syncedAt, reportKey, reportMode, 'success', 'Sync berhasil');

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

  sheet.hideRows(startRow);
  sheet.hideRows(endRow);

  sheet.getRange(titleRow, 1, 1, PRODUCT_HEADERS.length)
    .merge()
    .setFontWeight('bold')
    .setFontSize(13)
    .setBackground(BLUE_HEADER)
    .setFontColor(TEXT_COLOR)
    .setHorizontalAlignment('center');

  sheet.getRange(generatedRow, 1, 1, PRODUCT_HEADERS.length)
    .merge()
    .setFontStyle('italic')
    .setFontColor('#5f6b7a');

  sheet.getRange(headerRow, 1, 1, PRODUCT_HEADERS.length)
    .setFontWeight('bold')
    .setBackground(BLUE_HEADER)
    .setHorizontalAlignment('center');

  sheet.getRange(headerRow, 1, totalRow - headerRow + 1, PRODUCT_HEADERS.length)
    .setBorder(true, true, true, true, true, true);

  sheet.getRange(totalRow, 1, 1, PRODUCT_HEADERS.length)
    .setFontWeight('bold')
    .setBackground(PINK_TOTAL);

  sheet.getRange(headerRow + 1, 1, totalRow - headerRow, 1).setHorizontalAlignment('center');
  sheet.getRange(headerRow + 1, 4, totalRow - headerRow, 1).setHorizontalAlignment('center');
  sheet.getRange(headerRow + 1, 3, totalRow - headerRow, 7).setHorizontalAlignment('right');
  sheet.getRange(headerRow + 1, 3, totalRow - headerRow, 6).setNumberFormat('"Rp" #,##0');
  sheet.getRange(headerRow + 1, 9, totalRow - headerRow, 1).setNumberFormat('"Rp" #,##0');
  sheet.getRange(headerRow + 1, 10, totalRow - headerRow, 1).setNumberFormat('0.00%');

  formatSectionTitles(sheet, startRow, rowCount);
  formatSummaryCurrency(sheet, startRow, rowCount);

  sheet.autoResizeColumns(1, PRODUCT_HEADERS.length);
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

function buildFallbackReportKey(metadata) {
  const mode = metadata.reportModeSlug || metadata.reportMode || 'report';
  const date = metadata.periodValue || metadata.selectedDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  return `${String(mode).toLowerCase().replace(/\s+/g, '-')}-${date}`;
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

## 5. How Sync Updates Report Blocks

Santara POS sends an internal `Report Key`, but the key is hidden in the main
report sheet. The visible report uses a readable label such as:

* `Tanggal: 14 Juni 2026`
* `Periode: Juni 2026`
* `Periode: Semua Waktu`

The Apps Script uses hidden start/end marker rows to find the old block for the
same period. When you sync the same report again, it deletes the old block and
writes the updated one.

The technical `Report Key` is still visible in `Sync Logs` so you can debug sync
history if needed.

## 6. Test Safely

Use `Hari Ini` first with a small test report.

Check:

* `Laporan Penjualan` has a readable report block.
* The product table has blue headers and a pink total row.
* Payment, discount, expenses, and closing summaries appear below the product table.
* `Sync Logs` records the sync attempt.

Then click `Sync Google Sheet` again for the same period. The old block should
be replaced, not duplicated.

If sync fails, Santara POS still keeps data locally. Check that the Apps Script
deployment is active and that the URL ends with `/exec`.
