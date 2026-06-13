import { useMemo, useState } from 'react';
import { ReceiptPreview } from './ReceiptPreview';
import type { CompletedTransaction, PaymentMethod } from '../types';
import { formatReceiptDate, formatRupiah } from '../utils/format';

type ReceiptHistoryProps = {
  transactions: CompletedTransaction[];
};

type PaymentFilter = 'Semua' | PaymentMethod;

const paymentFilters: PaymentFilter[] = ['Semua', 'Cash', 'QRIS', 'Debit'];

export function ReceiptHistory({ transactions }: ReceiptHistoryProps) {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('Semua');
  const [selectedReceiptNumber, setSelectedReceiptNumber] = useState<string | null>(
    transactions[transactions.length - 1]?.receiptNumber ?? null,
  );

  const todayKey = new Date().toDateString();
  const todayTransactions = transactions.filter(
    (transaction) => new Date(transaction.dateTime).toDateString() === todayKey,
  );
  const totalSalesToday = todayTransactions.reduce(
    (total, transaction) => total + transaction.totalAfterDiscount,
    0,
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const matchesSearch = transaction.receiptNumber
          .toLowerCase()
          .includes(search.toLowerCase().trim());
        const matchesPayment =
          paymentFilter === 'Semua' || transaction.paymentMethod === paymentFilter;

        return matchesSearch && matchesPayment;
      }),
    [paymentFilter, search, transactions],
  );

  const selectedTransaction =
    transactions.find(
      (transaction) => transaction.receiptNumber === selectedReceiptNumber,
    ) ??
    filteredTransactions[0] ??
    null;

  return (
    <section className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_410px]">
      <div className="flex min-h-0 flex-col rounded-lg bg-santara-foam/80 p-3 shadow-soft ring-1 ring-santara-latte/70">
        <div className="border-b border-santara-latte/70 pb-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-santara-clay">
            Operasional
          </p>
          <h2 className="text-2xl font-black text-santara-roast">Riwayat Struk</h2>
          <p className="text-sm text-santara-roast/65">
            Struk dari sesi aplikasi saat ini untuk cek ulang dan reprint.
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <HistoryCard label="Total struk hari ini" value={String(todayTransactions.length)} />
          <HistoryCard
            label="Total penjualan hari ini"
            value={formatRupiah(totalSalesToday)}
          />
          <HistoryCard
            label="Total struk tersimpan di sesi ini"
            value={String(transactions.length)}
          />
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_280px]">
          <input
            className="rounded-lg bg-white px-4 py-3 text-sm font-bold text-santara-roast outline-none ring-1 ring-santara-latte transition placeholder:text-santara-roast/35 focus:ring-2 focus:ring-santara-clay"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nomor struk"
            type="search"
            value={search}
          />
          <div className="grid grid-cols-4 gap-2">
            {paymentFilters.map((filter) => (
              <button
                className={`rounded-lg px-3 py-3 text-xs font-black transition ${
                  paymentFilter === filter
                    ? 'bg-santara-bean text-white'
                    : 'bg-white text-santara-roast ring-1 ring-santara-latte'
                }`}
                key={filter}
                onClick={() => setPaymentFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {filteredTransactions.length === 0 ? (
            <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-santara-latte bg-santara-cream/70 p-5 text-center">
              <div>
                <p className="font-black">Belum ada struk</p>
                <p className="mt-1 text-sm text-santara-roast/65">
                  Selesaikan transaksi di tab Kasir untuk melihat riwayat struk.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <button
                  className={`w-full rounded-lg p-3 text-left ring-1 transition ${
                    selectedTransaction?.receiptNumber === transaction.receiptNumber
                      ? 'bg-santara-bean text-white ring-santara-bean'
                      : 'bg-white text-santara-roast ring-santara-latte hover:bg-santara-cream'
                  }`}
                  key={transaction.receiptNumber}
                  onClick={() => setSelectedReceiptNumber(transaction.receiptNumber)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{transaction.receiptNumber}</p>
                      <p className="mt-1 text-xs font-bold opacity-75">
                        {formatReceiptDate(transaction.dateTime)} -{' '}
                        {transaction.cashierName}
                      </p>
                    </div>
                    <p className="text-right text-sm font-black">
                      {formatRupiah(transaction.totalAfterDiscount)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold opacity-80">
                    <span>{transaction.paymentMethod}</span>
                    <span>{getTransactionQuantity(transaction)} item</span>
                    {transaction.discountAmount > 0 && (
                      <span>Diskon {formatRupiah(transaction.discountAmount)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-santara-latte lg:min-h-0">
        <div className="flex items-center justify-between gap-3 border-b border-santara-latte px-3 py-3">
          <div>
            <h3 className="font-black">Detail Struk</h3>
            <p className="text-xs text-santara-roast/60">
              Buka detail dan reprint struk.
            </p>
          </div>
          <button
            className="rounded-full bg-santara-bean px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-santara-roast disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!selectedTransaction}
            onClick={() => window.print()}
            type="button"
          >
            Reprint
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {selectedTransaction ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-santara-cream p-3 ring-1 ring-santara-latte">
                <p className="font-black">{selectedTransaction.receiptNumber}</p>
                <p className="mt-1 text-xs font-bold text-santara-roast/60">
                  {formatReceiptDate(selectedTransaction.dateTime)}
                </p>
                <div className="mt-3 space-y-1 text-sm font-bold">
                  {selectedTransaction.items.map((item) => (
                    <div className="flex justify-between gap-2" key={item.id}>
                      <span>
                        {item.quantity}x {item.nameSnapshot}
                      </span>
                      <span>{formatRupiah(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ReceiptPreview transaction={selectedTransaction} />
            </div>
          ) : (
            <div className="grid h-full min-h-72 place-items-center rounded-lg border border-dashed border-santara-latte bg-santara-cream/70 p-5 text-center">
              <p className="text-sm font-bold text-santara-roast/60">
                Pilih struk untuk melihat detail.
              </p>
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}

type HistoryCardProps = {
  label: string;
  value: string;
};

function HistoryCard({ label, value }: HistoryCardProps) {
  return (
    <div className="rounded-lg bg-white px-3 py-3 ring-1 ring-santara-latte">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-santara-sage">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-santara-roast">{value}</p>
    </div>
  );
}

function getTransactionQuantity(transaction: CompletedTransaction) {
  return transaction.items.reduce((total, item) => total + item.quantity, 0);
}
