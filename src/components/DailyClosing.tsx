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
  const [showClosingDetails, setShowClosingDetails] = useState(false);
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
      ['Kas Seharusnya', expectedCash],
    ],
    [cashSales, debitSales, expectedCash, grabSales, qrisSales, report, shopeeSales],
  );
  const activeStep = !openingCash ? 1 : !actualCash ? 2 : 3;

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

  const handleSaveOpeningCash = () => {
    if (!isDateClosingAvailable) return;
    const closing = buildClosing();
    onSaveClosing({
      ...closing,
      actualCash: openingCashValue,
      cashDifference: openingCashValue - expectedCash,
    });
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
    <section className="rounded-xl bg-white p-3 ring-1 ring-santara-latte sm:p-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-santara-clay">Tutup Kasir</p>
        <h3 className="text-lg font-black text-santara-roast">Tutup Kasir &amp; Ringkasan Harian</h3>
        <p className="text-sm text-santara-roast/65">
          Ikuti tiga langkah singkat berikut agar kas dan laporan harian tercatat rapi.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ['1', 'Saldo Awal'],
          ['2', 'Hitung Kas'],
          ['3', 'Simpan & Cetak'],
        ].map(([number, label], index) => (
          <div className={`rounded-xl border px-2 py-2.5 text-center ${activeStep >= index + 1 ? 'border-santara-bean/20 bg-santara-cream text-santara-bean' : 'border-gray-100 bg-gray-50 text-gray-400'}`} key={number}>
            <span className="mx-auto grid size-6 place-items-center rounded-full bg-white text-[11px] font-black shadow-sm">{number}</span>
            <p className="mt-1 text-[10px] font-black sm:text-xs">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          ['Penjualan Cash', cashSales],
          ['Pengeluaran Cash', cashExpenses],
          ['Kas Seharusnya', expectedCash],
          ['Selisih Kas', cashDifference],
        ].map(([label, value]) => (
          <div className="rounded-lg bg-santara-cream/75 px-3 py-2 ring-1 ring-santara-latte" key={label}>
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-santara-sage">{label}</p>
            <p className={`mt-1 text-sm font-black ${label === 'Selisih Kas' && cashDifference !== 0 ? 'text-santara-clay' : 'text-santara-roast'}`}>
              {formatRupiah(Number(value))}
            </p>
          </div>
        ))}
      </div>

      <button
        aria-expanded={showClosingDetails}
        className="mt-2 flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-xs font-black text-santara-bean ring-1 ring-santara-latte"
        onClick={() => setShowClosingDetails((isShown) => !isShown)}
        type="button"
      >
        <span>{showClosingDetails ? 'Sembunyikan rincian penjualan' : 'Lihat rincian penjualan & pembayaran'}</span>
        <span aria-hidden="true" className={`transition-transform ${showClosingDetails ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {showClosingDetails && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {closingSummary.map(([label, value]) => (
            <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-santara-latte" key={label}>
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-santara-sage">{label}</p>
              <p className="mt-1 text-sm font-black text-santara-roast">{formatRupiah(Number(value))}</p>
            </div>
          ))}
        </div>
      )}

      <form className="mt-3 grid gap-3 rounded-xl bg-santara-foam/55 p-3 lg:grid-cols-[160px_160px_minmax(180px,1fr)]" onSubmit={handleSubmit}>
        <MoneyInput label="1. Saldo Awal Cash" onChange={setOpeningCash} value={openingCash} />
        <MoneyInput label="2. Kas Aktual" onChange={setActualCash} value={actualCash} />
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-santara-sage">Catatan (Opsional)</span>
          <input className="mt-1 w-full rounded-lg bg-white px-3 py-3 text-sm font-bold text-santara-roast outline-none ring-1 ring-santara-latte focus:ring-2 focus:ring-santara-clay" onChange={(event) => setNotes(event.target.value)} placeholder="Contoh: selisih karena uang tip" value={notes} />
        </label>
        <div className="grid gap-2 sm:grid-cols-3 lg:col-span-3">
          <button className="rounded-lg bg-santara-cream px-4 py-3 text-sm font-black text-santara-bean ring-1 ring-santara-latte disabled:opacity-45" disabled={!isDateClosingAvailable || isPrinting} onClick={handleSaveOpeningCash} type="button">Simpan Saldo Awal</button>
          <button className="rounded-lg bg-white px-4 py-3 text-sm font-black text-santara-bean ring-1 ring-santara-latte disabled:opacity-45" disabled={!isDateClosingAvailable || isPrinting} type="submit">Simpan Tutup Kasir</button>
          <button className="rounded-lg bg-santara-bean px-4 py-3 text-sm font-black text-white hover:bg-santara-roast disabled:opacity-45" disabled={!isDateClosingAvailable || isPrinting} onClick={handleSaveAndPrint} type="button">{isPrinting ? 'Mencetak...' : 'Simpan & Cetak Ringkasan'}</button>
        </div>
      </form>
      {printError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{printError}</p>}
      <p className="mt-2 text-xs font-semibold text-santara-roast/55">
        Kas Seharusnya = Saldo Awal + Penjualan Cash - Pengeluaran Cash.
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
