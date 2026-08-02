import { useMemo, useState, type ReactNode } from 'react';
import { DailyClosing } from './DailyClosing';
import { GoogleSheetSync } from './GoogleSheetSync';
import type {
  CompletedTransaction,
  DailyClosing as DailyClosingData,
  Expense,
  GoogleSheetSyncLog,
  GoogleSheetSyncSettings,
  LegacySale,
} from '../types';
import { formatRupiah } from '../utils/format';
import {
  buildSalesReport,
  getTodayInputValue,
  type MenuSalesSummary,
  type ReportMode,
} from '../utils/reports';

type ReportsProps = {
  transactions: CompletedTransaction[];
  legacySales: LegacySale[];
  expenses: Expense[];
  dailyClosings: DailyClosingData[];
  googleSheetSyncSettings: GoogleSheetSyncSettings;
  googleSheetSyncLogs: GoogleSheetSyncLog[];
  currentUserName: string;
  onPrintSummary: (
    report: ReturnType<typeof buildSalesReport>,
    closing: DailyClosingData,
  ) => Promise<void>;
  onSaveClosing: (closing: DailyClosingData) => void;
  onSaveGoogleSheetSettings: (settings: GoogleSheetSyncSettings) => void;
  onAddGoogleSheetSyncLog: (log: GoogleSheetSyncLog) => void;
};

const reportModes: { label: string; value: ReportMode }[] = [
  { label: 'Hari Ini', value: 'today' },
  { label: 'Pilih Tanggal', value: 'date' },
  { label: 'Bulan Ini', value: 'month' },
  { label: 'Semua Waktu', value: 'all' },
];

export function Reports({
  currentUserName,
  dailyClosings,
  expenses,
  googleSheetSyncLogs,
  googleSheetSyncSettings,
  legacySales,
  onAddGoogleSheetSyncLog,
  onPrintSummary,
  onSaveClosing,
  onSaveGoogleSheetSettings,
  transactions,
}: ReportsProps) {
  const [reportMode, setReportMode] = useState<ReportMode>('today');
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue);
  const report = useMemo(
    () =>
      buildSalesReport(
        transactions,
        reportMode,
        selectedDate,
        legacySales,
        expenses,
        dailyClosings,
      ),
    [dailyClosings, expenses, legacySales, reportMode, selectedDate, transactions],
  );
  const hasReportData = report.totalTransactions > 0 || report.expenses.length > 0;
  const closingDate =
    reportMode === 'today' ? getTodayInputValue() : reportMode === 'date' ? selectedDate : '';
  const canUseDailyClosing = reportMode === 'today' || reportMode === 'date';

  return (
    <section className="min-h-full w-full min-w-0 max-w-full overflow-x-hidden rounded-2xl border border-santara-latte/40 bg-white/80 p-3 shadow-elegant backdrop-blur-sm sm:p-4 lg:flex lg:min-h-0 lg:flex-col">
      {/* Premium Header */}
      <div className="flex min-w-0 shrink-0 flex-col gap-3 border-b border-santara-latte/50 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-santara-gold">
            Laporan
          </p>
          <h2 className="text-2xl font-black text-santara-roast tracking-tight mt-1">
            Laporan Penjualan
          </h2>
        </div>

        {/* Premium Report Mode Buttons */}
        <div className="grid w-full min-w-0 gap-3 lg:max-w-[780px]">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {reportModes.map((mode) => (
              <button
                className={`min-w-0 rounded-xl px-2 py-2.5 text-xs font-bold transition-all duration-200 sm:min-w-[130px] sm:flex-none sm:px-4 sm:py-3 ${
                  reportMode === mode.value
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
                key={mode.value}
                onClick={() => setReportMode(mode.value)}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>

          {reportMode === 'date' && (
            <input
              className="input-premium w-full sm:w-[220px]"
              onChange={(event) => setSelectedDate(event.target.value)}
              type="date"
              value={selectedDate}
            />
          )}
        </div>
      </div>

      <div className="min-w-0 max-w-full pt-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {!hasReportData ? (
          <div className="space-y-3">
            <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
              <EmptyReportState />
              <GoogleSheetSync
                currentUserName={currentUserName}
                hasReportData={hasReportData}
                logs={googleSheetSyncLogs}
                mode="report"
                onAddLog={onAddGoogleSheetSyncLog}
                onSaveSettings={onSaveGoogleSheetSettings}
                report={report}
                reportMode={reportMode}
                selectedDate={selectedDate}
                settings={googleSheetSyncSettings}
              />
            </section>

            {canUseDailyClosing && (
              <DailyClosing
                cashierName={currentUserName}
                key={report.dailyClosing?.id ?? closingDate}
                onPrintSummary={onPrintSummary}
                onSaveClosing={onSaveClosing}
                report={report}
                selectedDate={closingDate}
              />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <ReportCard
                label="Penjualan Kotor"
                value={formatRupiah(report.grossSales)}
              />
              <ReportCard
                label="Total Diskon"
                value={formatRupiah(report.totalDiscount)}
              />
              <ReportCard
                label="Penjualan Bersih"
                value={formatRupiah(report.netSales)}
              />
              <ReportCard label="Total HPP" value={formatRupiah(report.totalHpp)} />
              <ReportCard
                label="Laba Kotor"
                value={formatRupiah(report.grossProfit)}
              />
              <ReportCard
                label="Gross Margin"
                value={formatPercent(report.grossMargin)}
              />
              <ReportCard
                label="Total Transaksi"
                value={`${report.totalTransactions} data`}
              />
              <ReportCard
                label="Rata-rata Transaksi"
                value={formatRupiah(report.averageTransactionValue)}
              />
              <ReportCard
                label="Total Pengeluaran"
                value={formatRupiah(report.totalExpenses)}
              />
              <ReportCard
                label="Laba Bersih"
                value={formatRupiah(report.netProfit)}
              />
              <ReportCard
                label="Net Margin"
                value={formatPercent(report.netMargin)}
              />
            </section>

            <section className="grid min-w-0 gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-1">
                <Panel title="Ringkasan Pembayaran">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                    {report.paymentSummary.map((summary) => (
                      <SummaryLine
                        key={summary.method}
                        label={summary.method}
                        meta={`${summary.transactionCount} transaksi`}
                        value={formatRupiah(summary.total)}
                      />
                    ))}
                  </div>
                </Panel>

                <Panel title="Sumber Data">
                  <div className="space-y-2">
                    <SummaryLine
                      label="Transaksi POS"
                      value={`${report.sourceTransactionCount} struk`}
                    />
                    <SummaryLine
                      label="Import lama"
                      value={`${report.sourceLegacyCount} baris`}
                    />
                  </div>
                </Panel>

                <Panel title="Ringkasan Diskon">
                  <div className="space-y-2">
                    <SummaryLine
                      label="Total diskon"
                      value={formatRupiah(report.totalDiscount)}
                    />
                    <SummaryLine
                      label="Transaksi berdiskon"
                      value={`${report.discountedTransactionCount} struk`}
                    />
                    <SummaryLine
                      label="Rata-rata diskon"
                      value={formatRupiah(report.averageDiscount)}
                    />
                  </div>
                </Panel>

                <Panel title="Ringkasan Pengeluaran">
                  {report.expenseSummary.length === 0 ? (
                    <p className="text-sm font-bold text-santara-roast/55">
                      Belum ada pengeluaran di periode ini.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {report.expenseSummary.map((summary) => (
                        <SummaryLine
                          key={summary.category}
                          label={summary.category}
                          value={formatRupiah(summary.total)}
                        />
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Best Seller">
                  {report.bestSellers.length === 0 ? (
                    <p className="text-sm font-bold text-santara-roast/55">
                      Belum ada item terjual di periode ini.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {report.bestSellers.map((item, index) => (
                        <BestSellerItem
                          index={index + 1}
                          item={item}
                          key={item.key}
                        />
                      ))}
                    </div>
                  )}
                </Panel>
              </div>

              <Panel className="min-w-0" title="Ringkasan Penjualan Menu">
                {report.menuSales.length === 0 ? (
                  <p className="text-sm font-bold text-santara-roast/55">
                    Belum ada menu terjual di periode ini.
                  </p>
                ) : (
                  <MenuSalesTable items={report.menuSales} />
                )}
              </Panel>
            </section>

            <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
              <Panel className="min-w-0" title="Daftar Pengeluaran">
                {report.expenses.length === 0 ? (
                  <p className="text-sm font-bold text-santara-roast/55">
                    Belum ada pengeluaran di periode ini.
                  </p>
                ) : (
                  <ExpenseTable expenses={report.expenses} />
                )}
              </Panel>

              <GoogleSheetSync
                currentUserName={currentUserName}
                hasReportData={hasReportData}
                logs={googleSheetSyncLogs}
                mode="report"
                onAddLog={onAddGoogleSheetSyncLog}
                onSaveSettings={onSaveGoogleSheetSettings}
                report={report}
                reportMode={reportMode}
                selectedDate={selectedDate}
                settings={googleSheetSyncSettings}
              />
            </section>

            {canUseDailyClosing && (
              <DailyClosing
                cashierName={currentUserName}
                key={report.dailyClosing?.id ?? closingDate}
                onPrintSummary={onPrintSummary}
                onSaveClosing={onSaveClosing}
                report={report}
                selectedDate={closingDate}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

type ExpenseTableProps = {
  expenses: Expense[];
};

function ExpenseTable({ expenses }: ExpenseTableProps) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {expenses.map((expense) => (
          <article className="rounded-lg bg-santara-cream/70 p-3 ring-1 ring-santara-latte" key={expense.id}>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-santara-roast">{expense.name}</p>
                <p className="mt-0.5 text-[11px] font-bold text-santara-roast/55">
                  {expense.date} · {expense.category}
                </p>
              </div>
              <p className="shrink-0 text-sm font-black text-santara-bean">{formatRupiah(expense.amount)}</p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-santara-roast/65">
              <span>{expense.quantity ? `${expense.quantity} ${expense.unit ?? ''}`.trim() : 'Tanpa jumlah'}</span>
              <span>{expense.paymentMethod}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden max-w-full overflow-x-auto rounded-lg ring-1 ring-santara-latte md:block">
        <table className="w-full min-w-[720px] border-collapse bg-white text-left text-sm">
        <thead className="bg-santara-cream text-[10px] font-black uppercase tracking-[0.08em] text-santara-sage">
          <tr>
            <TableHeader>Tanggal</TableHeader>
            <TableHeader>Nama</TableHeader>
            <TableHeader>Jumlah</TableHeader>
            <TableHeader>Kategori</TableHeader>
            <TableHeader>Metode</TableHeader>
            <TableHeader align="right">Nominal</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-santara-latte">
          {expenses.map((expense) => (
            <tr className="transition hover:bg-santara-cream/55" key={expense.id}>
              <TableCell>{expense.date}</TableCell>
              <TableCell strong>{expense.name}</TableCell>
              <TableCell>
                {expense.quantity
                  ? `${expense.quantity} ${expense.unit ?? ''}`.trim()
                  : '-'}
              </TableCell>
              <TableCell>{expense.category}</TableCell>
              <TableCell>{expense.paymentMethod}</TableCell>
              <TableCell align="right">{formatRupiah(expense.amount)}</TableCell>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}

type ReportCardProps = {
  label: string;
  value: string;
};

function ReportCard({ label, value }: ReportCardProps) {
  return (
    <div className="rounded-lg bg-white px-3 py-3 ring-1 ring-santara-latte">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-santara-sage">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-santara-roast">{value}</p>
    </div>
  );
}

type PanelProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <section className={`max-w-full rounded-lg bg-white p-3 ring-1 ring-santara-latte ${className}`}>
      <h3 className="text-base font-black text-santara-roast">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

type SummaryLineProps = {
  label: string;
  value: string;
  meta?: string;
};

function SummaryLine({ label, value, meta }: SummaryLineProps) {
  return (
    <div className="flex min-w-0 flex-col items-start justify-between gap-1 rounded-lg bg-santara-cream/75 px-3 py-2 ring-1 ring-santara-latte sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0">
        <p className="text-sm font-black text-santara-roast">{label}</p>
        {meta && (
          <p className="mt-0.5 text-xs font-bold text-santara-roast/55">{meta}</p>
        )}
      </div>
      <p className="shrink-0 text-left text-sm font-black text-santara-bean sm:text-right">{value}</p>
    </div>
  );
}

type MenuSalesTableProps = {
  items: MenuSalesSummary[];
};

function MenuSalesTable({ items }: MenuSalesTableProps) {
  return (
    <>
      <div className="space-y-2 lg:hidden">
        {items.map((item) => (
          <article className="rounded-lg bg-santara-cream/65 p-3 ring-1 ring-santara-latte" key={item.key}>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-santara-roast">{item.name}</p>
                <p className="mt-0.5 truncate text-[11px] font-bold text-santara-roast/55">{item.category}</p>
              </div>
              <span className="shrink-0 rounded-full bg-santara-bean px-2.5 py-1 text-xs font-black text-white">
                {item.quantity} item
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <ReportMetric label="Gross" value={formatRupiah(item.grossSales)} />
              <ReportMetric label="Diskon" value={formatRupiah(item.discountAmount)} />
              <ReportMetric label="Net" value={formatRupiah(item.netSales)} />
              <ReportMetric label="HPP" value={formatRupiah(item.hpp)} />
              <ReportMetric label="Profit" value={formatRupiah(item.estimatedProfit)} />
              <ReportMetric label="Margin" value={formatPercent(item.margin)} />
            </div>
          </article>
        ))}
      </div>
      <div className="hidden max-w-full overflow-x-auto rounded-lg ring-1 ring-santara-latte lg:block">
        <table className="min-w-[920px] w-full border-collapse bg-white text-left text-sm">
        <thead className="bg-santara-cream text-[10px] font-black uppercase tracking-[0.08em] text-santara-sage">
          <tr>
            <TableHeader>Menu</TableHeader>
            <TableHeader>Kategori</TableHeader>
            <TableHeader align="right">Qty</TableHeader>
            <TableHeader align="right">Gross Sales</TableHeader>
            <TableHeader align="right">Diskon</TableHeader>
            <TableHeader align="right">Net Sales</TableHeader>
            <TableHeader align="right">HPP</TableHeader>
            <TableHeader align="right">Profit</TableHeader>
            <TableHeader align="right">Margin</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-santara-latte">
          {items.map((item) => (
            <tr className="transition hover:bg-santara-cream/55" key={item.key}>
              <TableCell strong>{item.name}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell align="right">{item.quantity}</TableCell>
              <TableCell align="right">{formatRupiah(item.grossSales)}</TableCell>
              <TableCell align="right">{formatRupiah(item.discountAmount)}</TableCell>
              <TableCell align="right">{formatRupiah(item.netSales)}</TableCell>
              <TableCell align="right">{formatRupiah(item.hpp)}</TableCell>
              <TableCell align="right">{formatRupiah(item.estimatedProfit)}</TableCell>
              <TableCell align="right">{formatPercent(item.margin)}</TableCell>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white px-2 py-1.5 ring-1 ring-santara-latte/80">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-santara-sage">{label}</p>
      <p className="mt-0.5 truncate text-[11px] font-black text-santara-roast">{value}</p>
    </div>
  );
}

type TableHeaderProps = {
  children: ReactNode;
  align?: 'left' | 'right';
};

function TableHeader({ children, align = 'left' }: TableHeaderProps) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-3 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      scope="col"
    >
      {children}
    </th>
  );
}

type TableCellProps = {
  children: ReactNode;
  align?: 'left' | 'right';
  strong?: boolean;
};

function TableCell({ children, align = 'left', strong = false }: TableCellProps) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2.5 ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${strong ? 'font-black text-santara-roast' : 'font-bold text-santara-roast/75'}`}
    >
      {children}
    </td>
  );
}

type BestSellerItemProps = {
  index: number;
  item: MenuSalesSummary;
};

function BestSellerItem({ index, item }: BestSellerItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-santara-cream/75 px-3 py-2 ring-1 ring-santara-latte">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-santara-bean text-xs font-black text-white">
          {index}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{item.name}</p>
          <p className="text-xs font-bold text-santara-roast/55">{item.category}</p>
        </div>
      </div>
      <p className="shrink-0 text-sm font-black text-santara-bean">
        {item.quantity} item
      </p>
    </div>
  );
}

function EmptyReportState() {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-santara-latte bg-white p-5 text-center">
      <div>
        <p className="text-lg font-black text-santara-roast">
          Belum ada data transaksi
        </p>
        <p className="mt-2 max-w-md text-sm font-medium text-santara-roast/65">
          Selesaikan transaksi di tab Kasir atau import data lama, lalu laporan
          penjualan akan muncul otomatis di sini.
        </p>
      </div>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;
}
