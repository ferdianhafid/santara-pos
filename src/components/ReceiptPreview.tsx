import type { CompletedTransaction } from '../types';
import { formatReceiptDate, formatRupiah } from '../utils/format';

type ReceiptPreviewProps = {
  transaction: CompletedTransaction;
};

export function ReceiptPreview({ transaction }: ReceiptPreviewProps) {
  return (
    <section className="receipt-print-area rounded-lg bg-white p-4 ring-1 ring-santara-latte">
      <div className="receipt-paper mx-auto bg-white text-[#111]">
        <div className="text-center">
          <p className="text-[15px] font-black uppercase tracking-wide">
            Santara Coffee
          </p>
          <p className="mt-1 text-[10px] leading-tight">
            Ruang untuk cerita, jeda untuk jiwa
          </p>
        </div>

        <div className="my-3 border-y border-dashed border-[#111] py-2 text-[10px] leading-relaxed">
          <ReceiptRow label="Receipt" value={transaction.receiptNumber} />
          <ReceiptRow label="Date" value={formatReceiptDate(transaction.dateTime)} />
          <ReceiptRow label="Cashier" value={transaction.cashierName} />
        </div>

        <div className="space-y-2 text-[10px]">
          {transaction.items.map((item) => (
            <div key={item.id}>
              <div className="font-bold leading-tight">{item.nameSnapshot}</div>
              <div className="flex justify-between gap-2">
                <span>
                  {item.quantity} x {formatRupiah(item.unitPriceSnapshot)}
                </span>
                <span>{formatRupiah(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="my-3 border-t border-dashed border-[#111] pt-2 text-[10px] leading-relaxed">
          <ReceiptRow
            label="Subtotal"
            value={formatRupiah(transaction.subtotalBeforeDiscount)}
          />
          {transaction.discountAmount > 0 && (
            <ReceiptRow
              label="Discount"
              value={`-${formatRupiah(transaction.discountAmount)}`}
            />
          )}
          <ReceiptRow label="Total" strong value={formatRupiah(transaction.totalAfterDiscount)} />
          <ReceiptRow label="Payment" value={transaction.paymentMethod} />
          {transaction.paymentMethod === 'Cash' && (
            <>
              <ReceiptRow
                label="Paid"
                value={formatRupiah(transaction.paidAmount ?? 0)}
              />
              <ReceiptRow
                label="Change"
                value={formatRupiah(transaction.changeAmount ?? 0)}
              />
            </>
          )}
        </div>

        <div className="border-t border-dashed border-[#111] pt-2 text-center text-[10px] leading-relaxed">
          <p>WiFi: chillwithsantara</p>
          <p className="mt-2">Terima kasih sudah singgah di Santara.</p>
        </div>
      </div>
    </section>
  );
}

type ReceiptRowProps = {
  label: string;
  value: string;
  strong?: boolean;
};

function ReceiptRow({ label, value, strong = false }: ReceiptRowProps) {
  return (
    <div
      className={`flex justify-between gap-2 ${
        strong ? 'mt-1 text-[12px] font-black' : ''
      }`}
    >
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
