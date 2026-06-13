import { useMemo, useState } from 'react';
import type { DiscountType, PaymentMethod } from '../types';
import { formatRupiah } from '../utils/format';

type CheckoutModalProps = {
  subtotal: number;
  onClose: () => void;
  onComplete: (checkout: {
    discountType: DiscountType;
    discountValue: number;
    discountAmount: number;
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

export function CheckoutModal({ subtotal, onClose, onComplete }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValueInput, setDiscountValueInput] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState('');

  const discountValue = toPositiveNumber(discountValueInput);
  const paidAmount = toPositiveNumber(paidAmountInput);

  const discountAmount = useMemo(() => {
    if (discountType === 'fixed') {
      return Math.min(discountValue, subtotal);
    }

    if (discountType === 'percentage') {
      const percentage = Math.min(discountValue, 100);
      return Math.min(Math.round((subtotal * percentage) / 100), subtotal);
    }

    return 0;
  }, [discountType, discountValue, subtotal]);

  const totalAfterDiscount = Math.max(subtotal - discountAmount, 0);
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
      discountAmount,
      totalAfterDiscount,
      paymentMethod,
      paidAmount: paymentMethod === 'Cash' ? paidAmount : null,
      changeAmount,
    });
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-santara-roast/50 p-3 backdrop-blur-sm sm:place-items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-santara-foam shadow-soft ring-1 ring-santara-latte">
        <div className="flex items-start justify-between gap-4 border-b border-santara-latte px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-santara-clay">
              Checkout
            </p>
            <h2 className="text-xl font-black text-santara-roast sm:text-2xl">
              Payment & Discount
            </h2>
          </div>
          <button
            className="rounded-full px-4 py-2 text-sm font-black text-santara-clay ring-1 ring-santara-latte transition hover:bg-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <section>
              <h3 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-santara-sage">
                Discount
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(['none', 'fixed', 'percentage'] as DiscountType[]).map((type) => (
                  <button
                    className={`rounded-lg px-3 py-3 text-sm font-black capitalize transition ${
                      discountType === type
                        ? 'bg-santara-bean text-white'
                        : 'bg-white text-santara-roast ring-1 ring-santara-latte'
                    }`}
                    key={type}
                    onClick={() => setDiscountType(type)}
                    type="button"
                  >
                    {type === 'none' ? 'No Discount' : type}
                  </button>
                ))}
              </div>

              {discountType !== 'none' && (
                <label className="mt-3 block">
                  <span className="text-sm font-bold text-santara-roast/70">
                    {discountType === 'fixed' ? 'Discount amount' : 'Discount percentage'}
                  </span>
                  <div className="mt-2 flex items-center rounded-lg bg-white px-3 py-2 ring-1 ring-santara-latte focus-within:ring-2 focus-within:ring-santara-clay">
                    <span className="mr-2 font-black text-santara-bean">
                      {discountType === 'fixed' ? 'Rp' : '%'}
                    </span>
                    <input
                      className="min-w-0 flex-1 bg-transparent py-2 text-lg font-black outline-none sm:text-xl"
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

            <section>
              <h3 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-santara-sage">
                Payment Method
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    className={`rounded-lg px-3 py-4 text-base font-black transition ${
                      paymentMethod === method
                        ? 'bg-santara-bean text-white'
                        : 'bg-white text-santara-roast ring-1 ring-santara-latte'
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
                <label className="mt-3 block">
                  <span className="text-sm font-bold text-santara-roast/70">
                    Customer paid amount
                  </span>
                  <div className="mt-2 flex items-center rounded-lg bg-white px-3 py-2 ring-1 ring-santara-latte focus-within:ring-2 focus-within:ring-santara-clay">
                    <span className="mr-2 font-black text-santara-bean">Rp</span>
                    <input
                      className="min-w-0 flex-1 bg-transparent py-2 text-lg font-black outline-none sm:text-xl"
                      inputMode="numeric"
                      min="0"
                      onChange={(event) => setPaidAmountInput(event.target.value)}
                      placeholder="50000"
                      type="number"
                      value={paidAmountInput}
                    />
                  </div>
                  {isCashUnderpaid && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                      Paid amount is less than total.
                    </p>
                  )}
                </label>
              )}
            </section>
          </div>

          <section className="rounded-lg bg-white p-4 ring-1 ring-santara-latte">
            <h3 className="text-lg font-black">Summary</h3>
            <div className="mt-4 space-y-3 text-sm font-bold">
              <SummaryRow label="Subtotal" value={formatRupiah(subtotal)} />
              <SummaryRow
                label="Discount"
                value={discountAmount > 0 ? `-${formatRupiah(discountAmount)}` : formatRupiah(0)}
              />
              <SummaryRow
                emphasis
                label="Total"
                value={formatRupiah(totalAfterDiscount)}
              />
              <SummaryRow label="Method" value={paymentMethod} />
              {paymentMethod === 'Cash' && (
                <>
                  <SummaryRow label="Paid" value={formatRupiah(paidAmount)} />
                  <SummaryRow label="Change" value={formatRupiah(changeAmount ?? 0)} />
                </>
              )}
            </div>

            <button
              className="mt-5 w-full rounded-lg bg-santara-bean px-5 py-4 text-lg font-black text-white shadow-soft transition hover:bg-santara-roast disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canComplete}
              onClick={completePayment}
              type="button"
            >
              Complete Payment
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
};

function SummaryRow({ label, value, emphasis = false }: SummaryRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        emphasis ? 'border-t border-santara-latte pt-3 text-lg' : ''
      }`}
    >
      <span className="text-santara-roast/65">{label}</span>
      <span className="text-right text-santara-roast">{value}</span>
    </div>
  );
}
