import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { PendingOrder } from '../types';

type HoldOrderAction = 'resume' | 'delete';

type SaveOrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string) => void;
};

type ConfirmOrderModalProps = {
  action: HoldOrderAction;
  order: PendingOrder;
  onCancel: () => void;
  onConfirm: () => void;
};

export function SaveOrderModal({
  isOpen,
  onClose,
  onSave,
}: SaveOrderModalProps) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLabel('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const cleanLabel = label.trim();

  return (
    <ModalShell eyebrow="Simpan Order" title="Nama Order">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();

          if (cleanLabel) {
            onSave(cleanLabel);
          }
        }}
      >
        <label className="block">
          <span className="text-sm font-bold text-santara-roast/70">
            Nama Order
          </span>
          <input
            autoFocus
            className="mt-2 w-full rounded-lg bg-white px-4 py-3 text-lg font-black text-santara-roast outline-none ring-1 ring-santara-latte transition focus:ring-2 focus:ring-santara-clay"
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Contoh: Meja 1, Customer 1, Takeaway"
            type="text"
            value={label}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            className="rounded-lg bg-white px-4 py-3 text-sm font-black text-santara-clay ring-1 ring-santara-latte transition hover:bg-santara-cream"
            onClick={onClose}
            type="button"
          >
            Batal
          </button>
          <button
            className="rounded-lg bg-santara-bean px-4 py-3 text-sm font-black text-white shadow-soft transition hover:bg-santara-roast disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!cleanLabel}
            type="submit"
          >
            Simpan
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ConfirmOrderModal({
  action,
  order,
  onCancel,
  onConfirm,
}: ConfirmOrderModalProps) {
  const isResume = action === 'resume';

  return (
    <ModalShell
      eyebrow={isResume ? 'Lanjutkan Order' : 'Hapus Order'}
      title={isResume ? 'Ganti cart aktif?' : 'Hapus order tersimpan?'}
    >
      <div className="space-y-4">
        <p className="text-sm font-medium leading-relaxed text-santara-roast/70">
          {isResume
            ? `Cart aktif akan diganti dengan order "${order.label}".`
            : `Order "${order.label}" akan dihapus dari daftar order tersimpan.`}
        </p>

        <div className="rounded-lg bg-santara-cream px-4 py-3 ring-1 ring-santara-latte">
          <p className="text-sm font-black text-santara-roast">{order.label}</p>
          <p className="mt-1 text-xs font-bold text-santara-roast/60">
            Pilih lanjut hanya jika sudah yakin.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            className="rounded-lg bg-white px-4 py-3 text-sm font-black text-santara-clay ring-1 ring-santara-latte transition hover:bg-santara-cream"
            onClick={onCancel}
            type="button"
          >
            Batal
          </button>
          <button
            className="rounded-lg bg-santara-bean px-4 py-3 text-sm font-black text-white shadow-soft transition hover:bg-santara-roast"
            onClick={onConfirm}
            type="button"
          >
            {isResume ? 'Lanjutkan Order' : 'Hapus Order'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

type ModalShellProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

function ModalShell({ eyebrow, title, children }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-santara-roast/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-santara-foam p-5 shadow-soft ring-1 ring-santara-latte">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-santara-clay">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-black text-santara-roast">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
