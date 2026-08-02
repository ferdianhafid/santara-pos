import { useMemo, useState, type FormEvent } from 'react';
import type { DailyClosing as DailyClosingData } from '../types';
import { formatRupiah } from '../utils/format';
import type { SalesReport } from '../utils/reports';

type DailyClosingProps = {
  cashierName: string;
  onPrintSummary: (
    report: SalesReport,
    closing: DailyClosingData,
  ) => Promise<void>;
  onSaveClosing: (closing: DailyClosingData) => void;
  report: SalesReport;
  selectedDate: string;
};

export function DailyClosing({
  cashierName,
  onPrintSummary,
  onSaveClosing,
  report,
  selectedDate,
}: DailyClosingProps) {
  const existingClosing = report.dailyClosing;
  const [openingCash, setOpeningCash] = useState(
    existingClosing ? String(existingClosing.openingCash) : '',
  );
  const [actualCash, setActualCash] = useState(
    existingClosing ? String(existingClosing.actualCash) : '',
  );
  const [notes, setNotes] = useState(existingClosing?.notes ?? '');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState('');
  const cashSales = getPaymentTotal(report, 'Cash');
  const qrisSales = getPaymentTotal(report, 'QRIS');
  const debitSales = getPaymentTotal(report, 'Debit');
  const grabSales = getPaymentTotal(report, 'Grab');
  const shopeeSales = getPaymentTotal(report, 'Shopee');
  const cashExpenses = report.expenses
    .filter((expense) => expense.paymentMethod === 'Cash')
    .reduce((total, expense) => total + expense.amount, 0);
  const openingCashValue = toSafeNumber(openingCash);
  const actualCashValue = toSafeNumber(actualCash);
  const expectedCash = openingCashValue + cashSales - cashExpenses;
  const cashDifference = actualCashValue - expectedCash;
  const isDateClosingAvailable = Boolean(selectedDate);
  const closingSummary = useMemo(
    () => [
      ['Penjualan Kotor', report.grossSales],
      ['Penjualan Bersih', report.netSales],
      ['Total Pengeluaran', report.totalExpenses],
      ['Laba Bersih', report.netProfit],
      ['Cash', cashSales],
      ['QRIS', qrisSales],
      ['Debit', debitSales],
      ['Grab', grabSales],
      ['Shopee', shopeeSales],
      ['Expected Cash', expectedCash],
    ],
    [cashSales, debitSales, expectedCash, grabSales, qrisSales, report, shopeeSales],
  );

  const buildClosing = (): DailyClosingData => {
    const now = new Date().toISOString();
    return {
      id: existingClosing?.id ?? `closing-${selectedDate}`,
      closingDate: selectedDate,
      cashierName,
      grossSales: report.grossSales,
      totalDiscount: report.totalDiscount,
      netSales: report.netSales,
      totalHpp: report.totalHpp,
      grossProfit: report.grossProfit,
      totalExpenses: report.totalExpenses,
      netProfit: report.netProfit,
      cashSales,
      qrisSales,
      debitSales,
      grabSales,
      shopeeSales,
      openingCash: openingCashValue,
      expectedCash,
      actualCash: actualCashValue,
      cashDifference,
      notes,
      createdAt: existingClosing?.createdAt ?? now,
      updatedAt: now,
      createdBy: existingClosing?.createdBy ?? cashierName,
    };
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDateClosingAvailable) onSaveClosing(buildClosing());
  };

  const handleSaveAndPrint = async () => {
    if (!isDateClosingAvailable || isPrinting) return;
    const closing = buildClosing();
    onSaveClosing(closing);
    setPrintError('');
    setIsPrinting(true);
    try {
      await onPrintSummary(report, closing);
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : 'Daily summary gagal dicetak.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <section className="rounded-lg bg-white p-3 ring-1 ring-santara-latte">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-santara-clay">Closing Harian</p>
        <h3 className="text-lg font-black text-santara-roast">Closing &amp; Daily Summary</h3>
        <p className="text-sm text-santara-roast/65">
          Isi saldo awal laci dan kas aktual, lalu simpan atau langsung cetak ringkasan.
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {closingSummary.map(([label, value]) => (
          <div className="rounded-lg bg-santara-cream/75 px-3 py-2 ring-1 ring-santara-latte" key={label}>
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-santara-sage">{label}</p>
            <p className="mt-1 text-sm font-black text-santara-roast">{formatRupiah(Number(value))}</p>
          </div>
        ))}
      </div>

      <form className="mt-3 grid gap-3 lg:grid-cols-[150px_150px_minmax(180px,1fr)_190px]" onSubmit={handleSubmit}>
        <MoneyInput label="Saldo Awal Cash" onChange={setOpeningCash} value={openingCash} />
        <MoneyInput label="Kas Aktual" onChange={setActualCash} value={actualCash} />
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-santara-sage">Catatan</span>
          <input
            className="mt-1 w-full rounded-lg bg-white px-3 py-3 text-sm font-bold text-santara-roast outline-none ring-1 ring-santara-latte focus:ring-2 focus:ring-santara-clay"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Catatan closing"
            value={notes}
          />
        </label>
        <div className="grid gap-2">
          <div className="rounded-lg bg-santara-cream px-3 py-2 ring-1 ring-santara-latte">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-santara-sage">Selisih Kas</p>
            <p className={`text-sm font-black ${cashDifference === 0 ? 'text-santara-roast' : 'text-santara-clay'}`}>
              {formatRupiah(cashDifference)}
            </p>
          </div>
          <button className="rounded-lg bg-white px-4 py-3 text-sm font-black text-santara-bean ring-1 ring-santara-latte disabled:opacity-45" disabled={!isDateClosingAvailable || isPrinting} type="submit">
            Simpan Closing
          </button>
          <button className="rounded-lg bg-santara-bean px-4 py-3 text-sm font-black text-white hover:bg-santara-roast disabled:opacity-45" disabled={!isDateClosingAvailable || isPrinting} onClick={handleSaveAndPrint} type="button">
            {isPrinting ? 'Mencetak...' : 'Simpan & Print Summary'}
          </button>
        </div>
      </form>
      {printError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{printError}</p>}
      <p className="mt-2 text-xs font-semibold text-santara-roast/55">
        Expected Cash = Saldo Awal + Penjualan Cash - Pengeluaran Cash.
      </p>
    </section>
  );
}

function MoneyInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-santara-sage">{label}</span>
      <input className="mt-1 w-full rounded-lg bg-white px-3 py-3 text-sm font-bold text-santara-roast outline-none ring-1 ring-santara-latte focus:ring-2 focus:ring-santara-clay" min="0" onChange={(event) => onChange(event.target.value)} placeholder="0" type="number" value={value} />
    </label>
  );
}

function getPaymentTotal(report: SalesReport, method: string) {
  return report.paymentSummary.find((summary) => summary.method === method)?.total ?? 0;
}

function toSafeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
