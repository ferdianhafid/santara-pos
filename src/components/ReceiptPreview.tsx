import type { CompletedTransaction } from '../types';
import { formatReceiptDate, formatRupiah } from '../utils/format';

type ReceiptPreviewProps = {
  transaction: CompletedTransaction;
};

export function ReceiptPreview({ transaction }: ReceiptPreviewProps) {
  const itemDiscountAmount = transaction.itemDiscountAmount ?? 0;
  const transactionDiscountAmount =
    transaction.transactionDiscountAmount ??
    Math.max(transaction.discountAmount - itemDiscountAmount, 0);

  return (
    <section className="receipt-print-area rounded-lg bg-white p-4 ring-1 ring-santara-latte">
      <div className="receipt-paper mx-auto bg-white text-[#111]">
        <div className="text-center">
          {transaction.status === 'voided' && (
            <p className="mb-2 border border-[#111] py-1 text-[11px] font-black">
              STRUK DIBATALKAN
            </p>
          )}
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
              {(item.itemDiscountAmount ?? 0) > 0 && (
                <div className="flex justify-between gap-2">
                  <span>Diskon item</span>
                  <span>-{formatRupiah(item.itemDiscountAmount ?? 0)}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="my-3 border-t border-dashed border-[#111] pt-2 text-[10px] leading-relaxed">
          <ReceiptRow
            label="Subtotal"
            value={formatRupiah(transaction.subtotalBeforeDiscount)}
          />
          {itemDiscountAmount > 0 && (
            <ReceiptRow
              label="Diskon item"
              value={`-${formatRupiah(itemDiscountAmount)}`}
            />
          )}
          {transactionDiscountAmount > 0 && (
            <ReceiptRow
              label="Diskon transaksi"
              value={`-${formatRupiah(transactionDiscountAmount)}`}
            />
          )}
          {transaction.discountAmount > 0 && (
            <ReceiptRow
              label="Total diskon"
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
          {transaction.status === 'voided' && transaction.voidReason && (
            <p className="mb-2">Alasan batal: {transaction.voidReason}</p>
          )}
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
