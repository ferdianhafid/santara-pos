# Google Sheets Sync - Santara POS

Santara POS syncs reports to Google Sheets through a simple Google Apps Script
Web App URL.

This is intentionally simple:

* No Google OAuth inside Santara POS.
* No Google API client inside Santara POS.
* The app sends the selected report to your Apps Script endpoint.
* Apps Script writes clean log-style rows into your Google Sheet.

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

This script creates these sheets:

* `Daily Report`
* `Menu Sales Log`
* `Payment Log`
* `Expense Log`
* `Closing Log`
* `Sync Logs`

When the same report period is synced again, the script updates or replaces the
matching rows instead of creating duplicates.

```js
const SPREADSHEET_ID = 'SPREADSHEET_ID_HERE';

const DAILY_REPORT_HEADERS = [
  'Report Key',
  'Report Mode',
  'Date / Period',
  'Generated At',
  'Gross Sales',
  'Total Discount',
  'Net Sales',
  'Total HPP',
  'Gross Profit',
  'Gross Margin',
  'Total Expenses',
  'Net Profit',
  'Net Margin',
  'Cash Sales',
  'QRIS Sales',
  'Debit Sales',
  'Total Transactions',
  'Average Transaction Value',
  'Source Transaction Count',
];

const MENU_SALES_HEADERS = [
  'Report Key',
  'Date / Period',
  'Menu',
  'Category',
  'Qty',
  'Gross Sales',
  'Discount',
  'Net Sales',
  'HPP',
  'Profit',
  'Margin',
];

const PAYMENT_HEADERS = [
  'Report Key',
  'Date / Period',
  'Payment Method',
  'Transaction Count',
  'Total',
];

const EXPENSE_HEADERS = [
  'Report Key',
  'Date / Period',
  'Expense Date',
  'Name',
  'Category',
  'Amount',
  'Payment Method',
  'Notes',
];

const CLOSING_HEADERS = [
  'Report Key',
  'Date / Period',
  'Expected Cash',
  'Actual Cash',
  'Cash Difference',
  'Notes',
  'Saved At / Updated At',
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
    const summary = payload.summary || {};

    reportKey = metadata.reportKey || summary.reportKey || buildFallbackReportKey(metadata);
    reportMode = metadata.reportMode || 'Unknown';
    const periodLabel = metadata.periodLabel || summary.periodLabel || metadata.selectedDate || '';

    const dailySheet = setupSheet(spreadsheet, 'Daily Report', DAILY_REPORT_HEADERS);
    const menuSheet = setupSheet(spreadsheet, 'Menu Sales Log', MENU_SALES_HEADERS);
    const paymentSheet = setupSheet(spreadsheet, 'Payment Log', PAYMENT_HEADERS);
    const expenseSheet = setupSheet(spreadsheet, 'Expense Log', EXPENSE_HEADERS);
    const closingSheet = setupSheet(spreadsheet, 'Closing Log', CLOSING_HEADERS);
    const syncLogSheet = setupSheet(spreadsheet, 'Sync Logs', SYNC_LOG_HEADERS);

    upsertRowByKey(dailySheet, reportKey, [
      reportKey,
      reportMode,
      periodLabel,
      metadata.generatedAt || syncedAt,
      toNumber(summary.grossSales),
      toNumber(summary.totalDiscount),
      toNumber(summary.netSales),
      toNumber(summary.totalHpp),
      toNumber(summary.grossProfit),
      toPercent(summary.grossMargin),
      toNumber(summary.totalExpenses),
      toNumber(summary.netProfit),
      toPercent(summary.netMargin),
      toNumber(summary.cashSales),
      toNumber(summary.qrisSales),
      toNumber(summary.debitSales),
      toNumber(summary.totalTransactions),
      toNumber(summary.averageTransactionValue),
      toNumber(summary.sourceTransactionCount),
    ]);

    replaceRowsForReportKey(
      menuSheet,
      reportKey,
      (payload.menuSales || []).map((item) => [
        reportKey,
        periodLabel,
        item.name,
        item.category,
        toNumber(item.quantity),
        toNumber(item.grossSales),
        toNumber(item.discountAmount),
        toNumber(item.netSales),
        toNumber(item.hpp),
        toNumber(item.estimatedProfit),
        toPercent(item.margin),
      ]),
    );

    replaceRowsForReportKey(
      paymentSheet,
      reportKey,
      (payload.paymentSummary || []).map((payment) => [
        reportKey,
        periodLabel,
        payment.method,
        toNumber(payment.transactionCount),
        toNumber(payment.total),
      ]),
    );

    replaceRowsForReportKey(
      expenseSheet,
      reportKey,
      (payload.expenseList || []).map((expense) => [
        reportKey,
        periodLabel,
        expense.date,
        expense.name,
        expense.category,
        toNumber(expense.amount),
        expense.paymentMethod,
        expense.notes,
      ]),
    );

    replaceRowsForReportKey(
      closingSheet,
      reportKey,
      payload.dailyClosing
        ? [[
            reportKey,
            periodLabel,
            toNumber(payload.dailyClosing.expectedCash),
            toNumber(payload.dailyClosing.actualCash),
            toNumber(payload.dailyClosing.cashDifference),
            payload.dailyClosing.notes || '',
            payload.dailyClosing.updatedAt || payload.dailyClosing.date || '',
          ]]
        : [],
    );

    appendSyncLog(syncLogSheet, syncedAt, reportKey, reportMode, 'success', 'Sync berhasil');
    applyAllFormats(spreadsheet);

    return jsonResponse({ ok: true, message: 'Data berhasil dikirim ke Google Sheets.' });
  } catch (error) {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const syncLogSheet = setupSheet(spreadsheet, 'Sync Logs', SYNC_LOG_HEADERS);
    const message = String(error);
    appendSyncLog(syncLogSheet, syncedAt, reportKey, reportMode, 'error', message);

    return jsonResponse({ ok: false, message });
  }
}

function setupSheet(spreadsheet, sheetName, headers) {
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const shouldResetHeaders = currentHeaders.join('|') !== headers.join('|');

  if (shouldResetHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  styleHeader(sheet, headers.length);

  return sheet;
}

function styleHeader(sheet, columnCount) {
  sheet.setFrozenRows(1);
  sheet
    .getRange(1, 1, 1, columnCount)
    .setFontWeight('bold')
    .setBackground('#efe2cf')
    .setFontColor('#4b2f22');
}

function upsertRowByKey(sheet, reportKey, row) {
  const existingRow = findRowByKey(sheet, reportKey);

  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    return;
  }

  sheet.appendRow(row);
}

function replaceRowsForReportKey(sheet, reportKey, rows) {
  deleteRowsByKey(sheet, reportKey);

  if (rows.length === 0) {
    return;
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function findRowByKey(sheet, reportKey) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index][0] === reportKey) {
      return index + 2;
    }
  }

  return null;
}

function deleteRowsByKey(sheet, reportKey) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (let index = keys.length - 1; index >= 0; index -= 1) {
    if (keys[index][0] === reportKey) {
      sheet.deleteRow(index + 2);
    }
  }
}

function appendSyncLog(sheet, syncedAt, reportKey, reportMode, status, message) {
  sheet.appendRow([syncedAt, reportKey, reportMode, status, message]);
}

function applyAllFormats(spreadsheet) {
  formatSheet(spreadsheet.getSheetByName('Daily Report'), {
    currency: ['E:I', 'K:P', 'R:R'],
    percent: ['J:J', 'M:M'],
  });
  formatSheet(spreadsheet.getSheetByName('Menu Sales Log'), {
    currency: ['F:J'],
    percent: ['K:K'],
  });
  formatSheet(spreadsheet.getSheetByName('Payment Log'), {
    currency: ['E:E'],
  });
  formatSheet(spreadsheet.getSheetByName('Expense Log'), {
    currency: ['F:F'],
  });
  formatSheet(spreadsheet.getSheetByName('Closing Log'), {
    currency: ['C:E'],
  });
  formatSheet(spreadsheet.getSheetByName('Sync Logs'), {});
}

function formatSheet(sheet, formats) {
  if (!sheet) {
    return;
  }

  (formats.currency || []).forEach((range) => {
    sheet.getRange(range).setNumberFormat('"Rp" #,##0');
  });

  (formats.percent || []).forEach((range) => {
    sheet.getRange(range).setNumberFormat('0.00%');
  });

  sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function buildFallbackReportKey(metadata) {
  const mode = metadata.reportModeSlug || metadata.reportMode || 'report';
  const date = metadata.selectedDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  return `${String(mode).toLowerCase().replace(/\s+/g, '-')}-${date}`;
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

## 5. How Sync Updates Rows

Santara POS now sends a stable `Report Key`.

Examples:

* `hari-ini-2026-06-14`
* `pilih-tanggal-2026-06-10`
* `bulan-ini-2026-06`
* `semua-waktu`

The Apps Script uses that key to:

* update one row in `Daily Report`;
* clear and rewrite matching rows in `Menu Sales Log`;
* clear and rewrite matching rows in `Payment Log`;
* clear and rewrite matching rows in `Expense Log`;
* clear and rewrite matching rows in `Closing Log`;
* append every sync attempt to `Sync Logs`.

This keeps weekly and monthly tracking cleaner because repeat syncs refresh the
same period instead of making duplicates.

## 6. Test Safely

Use `Hari Ini` first with a small test report.

Check these sheets:

* Daily Report
* Menu Sales Log
* Payment Log
* Expense Log
* Closing Log
* Sync Logs

Then click `Sync Google Sheet` again for the same period. The `Daily Report`
row should update, and the log sheets should not duplicate old rows for the
same `Report Key`.

If sync fails, Santara POS still keeps data locally. Check that the Apps Script
deployment is active and that the URL ends with `/exec`.
