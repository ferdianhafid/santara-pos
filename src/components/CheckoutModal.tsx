import { useMemo, useState } from 'react';
import type { DiscountType, PaymentMethod } from '../types';
import { formatRupiah } from '../utils/format';

type CheckoutModalProps = {
  subtotal: number;
  itemDiscountTotal: number;
  onClose: () => void;
  onComplete: (checkout: {
    discountType: DiscountType;
    discountValue: number;
    discountAmount: number;
    transactionDiscountAmount: number;
    totalAfterDiscount: number;
    paymentMethod: PaymentMethod;
    paidAmount: number | null;
    changeAmount: number | null;
  }) => void;
};

const paymentMethods: PaymentMethod[] = ['Cash', 'QRIS', 'Debit'];

const toPositiveNumber = (value: string) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
};

export function CheckoutModal({
  itemDiscountTotal,
  subtotal,
  onClose,
  onComplete,
}: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValueInput, setDiscountValueInput] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState('');

  const discountValue = toPositiveNumber(discountValueInput);
  const paidAmount = toPositiveNumber(paidAmountInput);

  const subtotalAfterItemDiscount = Math.max(subtotal - itemDiscountTotal, 0);

  const transactionDiscountAmount = useMemo(() => {
    if (discountType === 'fixed') {
      return Math.min(discountValue, subtotalAfterItemDiscount);
    }

    if (discountType === 'percentage') {
      const percentage = Math.min(discountValue, 100);
      return Math.min(
        Math.round((subtotalAfterItemDiscount * percentage) / 100),
        subtotalAfterItemDiscount,
      );
    }

    return 0;
  }, [discountType, discountValue, subtotalAfterItemDiscount]);

  const totalDiscountAmount = itemDiscountTotal + transactionDiscountAmount;
  const totalAfterDiscount = Math.max(
    subtotalAfterItemDiscount - transactionDiscountAmount,
    0,
  );
  const changeAmount =
    paymentMethod === 'Cash' ? Math.max(paidAmount - totalAfterDiscount, 0) : null;
  const isCashUnderpaid = paymentMethod === 'Cash' && paidAmount < totalAfterDiscount;
  const canComplete = subtotal > 0 && !isCashUnderpaid;

  const completePayment = () => {
    if (!canComplete) {
      return;
    }

    onComplete({
      discountType,
      discountValue: discountType === 'percentage' ? Math.min(discountValue, 100) : discountValue,
      discountAmount: totalDiscountAmount,
      transactionDiscountAmount,
      totalAfterDiscount,
      paymentMethod,
      paidAmount: paymentMethod === 'Cash' ? paidAmount : null,
      changeAmount,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Premium Header */}
        <div className="flex items-start justify-between gap-4 border-b border-santara-latte/50 px-5 py-4 bg-gradient-to-r from-santara-foam to-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-santara-gold">
              Checkout
            </p>
            <h2 className="text-2xl font-black text-santara-roast tracking-tight mt-1">
              Pembayaran & Diskon
            </h2>
          </div>
          <button
            className="btn-secondary px-4 py-2 text-sm font-bold rounded-xl"
            onClick={onClose}
            type="button"
          >
            Tutup
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {/* Discount Section */}
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-santara-sage">
                Diskon
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {(['none', 'fixed', 'percentage'] as DiscountType[]).map((type) => (
                  <button
                    className={`rounded-xl px-4 py-3 text-sm font-bold capitalize transition-all duration-200 ${
                      discountType === type
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                    key={type}
                    onClick={() => setDiscountType(type)}
                    type="button"
                  >
                    {type === 'none' ? 'Tanpa Diskon' : type === 'fixed' ? 'Nominal' : 'Persen'}
                  </button>
                ))}
              </div>

              {discountType !== 'none' && (
                <label className="mt-4 block animate-fade-in">
                  <span className="text-sm font-bold text-santara-roast/70">
                    {discountType === 'fixed' ? 'Jumlah diskon (Rp)' : 'Persentase diskon (%)'}
                  </span>
                  <div className="mt-2 flex items-center rounded-xl bg-white px-4 py-3 border border-santara-latte/50 shadow-inner-soft focus-within:ring-2 focus-within:ring-santara-gold/50 focus-within:border-santara-gold transition-all">
                    <span className="mr-3 font-bold text-santara-bean text-lg">
                      {discountType === 'fixed' ? 'Rp' : '%'}
                    </span>
                    <input
                      className="min-w-0 flex-1 bg-transparent py-1 text-xl font-black outline-none"
                      inputMode="numeric"
                      min="0"
                      onChange={(event) => setDiscountValueInput(event.target.value)}
                      placeholder={discountType === 'fixed' ? '5000' : '10'}
                      type="number"
                      value={discountValueInput}
                    />
                  </div>
                </label>
              )}
            </section>

            {/* Payment Method Section */}
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-santara-sage">
                Metode Pembayaran
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    className={`rounded-xl px-4 py-4 text-base font-bold transition-all duration-200 ${
                      paymentMethod === method
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    type="button"
                  >
                    {method}
                  </button>
                ))}
              </div>

              {paymentMethod === 'Cash' && (
                <label className="mt-4 block animate-fade-in">
                  <span className="text-sm font-bold text-santara-roast/70">
                    Jumlah uang yang diterima
                  </span>
                  <div className="mt-2 flex items-center rounded-xl bg-white px-4 py-3 border border-santara-latte/50 shadow-inner-soft focus-within:ring-2 focus-within:ring-santara-gold/50 focus-within:border-santara-gold transition-all">
                    <span className="mr-3 font-bold text-santara-bean text-lg">Rp</span>
                    <input
                      className="min-w-0 flex-1 bg-transparent py-1 text-xl font-black outline-none"
                      inputMode="numeric"
                      min="0"
                      onChange={(event) => setPaidAmountInput(event.target.value)}
                      placeholder="50000"
                      type="number"
                      value={paidAmountInput}
                    />
                  </div>
                  {isCashUnderpaid && (
                    <p className="mt-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 border border-red-200 animate-fade-in">
                      Jumlah uang kurang dari total pembayaran.
                    </p>
                  )}
                </label>
              )}
            </section>
          </div>

          {/* Premium Summary Card */}
          <section className="rounded-2xl bg-white p-5 border border-santara-latte/40 shadow-elegant">
            <h3 className="text-lg font-black text-santara-roast">Ringkasan</h3>
            <div className="mt-4 space-y-3 text-sm font-semibold">
              <SummaryRow label="Subtotal" value={formatRupiah(subtotal)} />
              <SummaryRow
                label="Diskon item"
                value={
                  itemDiscountTotal > 0
                    ? `-${formatRupiah(itemDiscountTotal)}`
                    : formatRupiah(0)
                }
              />
              <SummaryRow
                label="Diskon transaksi"
                value={
                  transactionDiscountAmount > 0
                    ? `-${formatRupiah(transactionDiscountAmount)}`
                    : formatRupiah(0)
                }
              />
              {totalDiscountAmount > 0 && (
                <SummaryRow
                  label="Total diskon"
                  value={`-${formatRupiah(totalDiscountAmount)}`}
                />
              )}
              <div className="border-t-2 border-santara-latte/30 pt-3 mt-2">
                <SummaryRow
                  emphasis
                  label="Total Bayar"
                  value={formatRupiah(totalAfterDiscount)}
                />
              </div>
              <SummaryRow label="Metode" value={paymentMethod} />
              {paymentMethod === 'Cash' && (
                <>
                  <SummaryRow label="Dibayar" value={formatRupiah(paidAmount)} />
                  <SummaryRow
                    label="Kembalian"
                    value={formatRupiah(changeAmount ?? 0)}
                    highlight={Boolean(changeAmount && changeAmount > 0)}
                  />
                </>
              )}
            </div>

            <button
              className="mt-5 w-full btn-primary px-6 py-4 text-lg font-black rounded-xl shadow-glow"
              disabled={!canComplete}
              onClick={completePayment}
              type="button"
            >
              Selesaikan Pembayaran
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
  emphasis?: boolean;
  highlight?: boolean;
};

function SummaryRow({ label, value, emphasis = false, highlight = false }: SummaryRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        emphasis ? 'pt-3 text-lg' : ''
      }`}
    >
      <span className={`${emphasis ? 'font-black text-santara-roast' : 'text-santara-roast/65'} ${emphasis ? 'text-base' : 'text-sm'}`}>{label}</span>
      <span className={`text-right ${highlight ? 'text-emerald-600 font-black' : emphasis ? 'font-black text-santara-bean' : 'text-santara-roast'} ${emphasis ? 'text-xl' : 'text-sm'}`}>{value}</span>
    </div>
  );
}
