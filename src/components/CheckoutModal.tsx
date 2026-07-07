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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm animate-fade-in sm:p-4">
      <div
        aria-labelledby="checkout-modal-title"
        aria-modal="true"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale sm:max-h-[calc(100dvh-2rem)]"
        role="dialog"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-xs font-semibold text-coffee-light uppercase tracking-wider">Checkout</p>
            <h2 className="text-2xl font-extrabold text-coffee-dark mt-1" id="checkout-modal-title">Pembayaran</h2>
          </div>
          <button
            aria-label="Tutup checkout"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="grid min-h-0 gap-5 overflow-y-auto overscroll-contain p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr),380px] lg:gap-6">
          {/* Left - Payment Options */}
          <div className="space-y-6">
            {/* Payment Method */}
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-3 block">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-4 rounded-2xl font-bold text-sm transition-all ${
                      paymentMethod === method
                        ? 'bg-gradient-to-r from-coffee to-coffee-light text-white shadow-lg'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Input */}
            {paymentMethod === 'Cash' && (
              <div className="animate-fade-in">
                <label className="text-sm font-semibold text-gray-600 mb-3 block">Jumlah Uang Diterima</label>
                <div className="flex items-center bg-gray-50 rounded-2xl px-4 py-4 border-2 border-transparent focus-within:border-coffee transition-colors">
                  <span className="text-lg font-bold text-gray-400 mr-3">Rp</span>
                  <input
                    type="number"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-2xl font-bold outline-none"
                  />
                </div>
                {isCashUnderpaid && (
                  <p className="text-sm text-red-500 mt-2 font-medium">Jumlah uang kurang dari total</p>
                )}
              </div>
            )}

            {/* Discount */}
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-3 block">Diskon</label>
              <div className="grid grid-cols-3 gap-3">
                {(['none', 'fixed', 'percentage'] as DiscountType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDiscountType(type)}
                    className={`py-3 rounded-2xl font-semibold text-sm transition-all ${
                      discountType === type
                        ? 'bg-coffee text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {type === 'none' ? 'Tanpa' : type === 'fixed' ? 'Nominal' : 'Persen'}
                  </button>
                ))}
              </div>
              {discountType !== 'none' && (
                <div className="mt-4 animate-fade-in">
                  <div className="flex items-center bg-gray-50 rounded-2xl px-4 py-4 border-2 border-transparent focus-within:border-coffee transition-colors">
                    <span className="text-lg font-bold text-gray-400 mr-3">{discountType === 'fixed' ? 'Rp' : '%'}</span>
                    <input
                      type="number"
                      value={discountValueInput}
                      onChange={(e) => setDiscountValueInput(e.target.value)}
                      placeholder={discountType === 'fixed' ? '0' : '0'}
                      className="flex-1 bg-transparent text-xl font-bold outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right - Summary */}
          <div className="bg-gray-50 rounded-3xl p-6">
            <h3 className="text-lg font-extrabold text-coffee-dark mb-4">Ringkasan</h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold">{formatRupiah(subtotal)}</span>
              </div>
              {itemDiscountTotal > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Diskon Item</span>
                  <span className="font-semibold">-{formatRupiah(itemDiscountTotal)}</span>
                </div>
              )}
              {transactionDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Diskon Transaksi</span>
                  <span className="font-semibold">-{formatRupiah(transactionDiscountAmount)}</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-gray-200 my-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-coffee-dark">Total Bayar</span>
                <span className="text-2xl font-extrabold text-coffee">{formatRupiah(totalAfterDiscount)}</span>
              </div>
            </div>

            {paymentMethod === 'Cash' && paidAmount > 0 && (
              <div className="space-y-2 bg-white rounded-2xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Dibayar</span>
                  <span className="font-semibold">{formatRupiah(paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-green-600">Kembalian</span>
                  <span className="text-xl font-extrabold text-green-600">{formatRupiah(changeAmount ?? 0)}</span>
                </div>
              </div>
            )}

            <button
              onClick={completePayment}
              disabled={!canComplete}
              className="w-full btn btn-primary mt-6"
            >
              Selesaikan Pembayaran
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
