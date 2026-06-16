import { useMemo, useState } from 'react';
import type { CartItem, DiscountType } from '../types';
import { formatRupiah } from '../utils/format';

type ItemDiscountModalProps = {
  item: CartItem | null;
  onApply: (id: string, discountType: DiscountType, discountValue: number) => void;
  onClose: () => void;
};

export function ItemDiscountModal({
  item,
  onApply,
  onClose,
}: ItemDiscountModalProps) {
  const [discountType, setDiscountType] = useState<DiscountType>(
    item?.itemDiscountType && item.itemDiscountType !== 'none'
      ? item.itemDiscountType
      : 'fixed',
  );
  const [discountValueInput, setDiscountValueInput] = useState(
    item?.itemDiscountValue ? String(item.itemDiscountValue) : '',
  );
  const grossLineTotal = item ? item.unitPriceSnapshot * item.quantity : 0;
  const discountValue = toNumber(discountValueInput);
  const errorMessage = useMemo(() => {
    if (!item) {
      return 'Item tidak ditemukan di cart.';
    }

    if (discountValue <= 0) {
      return 'Isi nominal atau persen diskon terlebih dahulu.';
    }

    if (discountType === 'fixed' && discountValue > grossLineTotal) {
      return 'Diskon nominal tidak boleh melebihi total item.';
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return 'Diskon persen maksimal 100%.';
    }

    return '';
  }, [discountType, discountValue, grossLineTotal, item]);
  const discountAmount =
    discountType === 'fixed'
      ? Math.min(discountValue, grossLineTotal)
      : Math.min(Math.round((grossLineTotal * discountValue) / 100), grossLineTotal);

  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-santara-roast/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-santara-foam p-5 shadow-soft ring-1 ring-santara-latte">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-santara-clay">
          Diskon item
        </p>
        <h2 className="mt-1 text-2xl font-black text-santara-roast">
          {item.nameSnapshot}
        </h2>
        <p className="mt-1 text-sm font-bold text-santara-roast/60">
          Total awal: {formatRupiah(grossLineTotal)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: 'Nominal', value: 'fixed' },
            { label: 'Persen', value: 'percentage' },
          ].map((option) => (
            <button
              className={`rounded-lg px-4 py-3 text-sm font-black transition ${
                discountType === option.value
                  ? 'bg-santara-bean text-white'
                  : 'bg-white text-santara-roast ring-1 ring-santara-latte'
              }`}
              key={option.value}
              onClick={() => setDiscountType(option.value as DiscountType)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="text-sm font-bold text-santara-roast/70">Value</span>
          <div className="mt-2 flex items-center rounded-lg bg-white px-3 py-2 ring-1 ring-santara-latte focus-within:ring-2 focus-within:ring-santara-clay">
            <span className="mr-2 font-black text-santara-bean">
              {discountType === 'fixed' ? 'Rp' : '%'}
            </span>
            <input
              className="min-w-0 flex-1 bg-transparent py-2 text-lg font-black outline-none"
              inputMode="numeric"
              min="0"
              onChange={(event) => setDiscountValueInput(event.target.value)}
              placeholder={discountType === 'fixed' ? '5000' : '10'}
              type="number"
              value={discountValueInput}
            />
          </div>
        </label>

        {discountValue > 0 && !errorMessage && (
          <div className="mt-3 rounded-lg bg-white p-3 text-sm font-bold ring-1 ring-santara-latte">
            <div className="flex justify-between">
              <span>Diskon item</span>
              <span>-{formatRupiah(discountAmount)}</span>
            </div>
            <div className="mt-1 flex justify-between text-santara-bean">
              <span>Total setelah diskon</span>
              <span>{formatRupiah(grossLineTotal - discountAmount)}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            className="rounded-lg bg-white px-4 py-3 text-sm font-black text-santara-clay ring-1 ring-santara-latte transition hover:bg-santara-cream"
            onClick={onClose}
            type="button"
          >
            Batal
          </button>
          <button
            className="rounded-lg bg-santara-cream px-4 py-3 text-sm font-black text-santara-bean ring-1 ring-santara-latte transition hover:bg-santara-foam"
            onClick={() => onApply(item.id, 'none', 0)}
            type="button"
          >
            Hapus Diskon
          </button>
          <button
            className="col-span-2 rounded-lg bg-santara-bean px-4 py-3 text-sm font-black text-white shadow-soft transition hover:bg-santara-roast disabled:cursor-not-allowed disabled:opacity-45"
            disabled={Boolean(errorMessage)}
            onClick={() => onApply(item.id, discountType, discountValue)}
            type="button"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

function toNumber(value: string) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}
