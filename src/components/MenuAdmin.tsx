import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { MenuCategory, MenuItem } from '../types';
import { formatRupiah } from '../utils/format';

type MenuAdminProps = {
  items: MenuItem[];
  categories: MenuCategory[];
  onAddCategory: (name: string) => void;
  onAddItem: (item: Omit<MenuItem, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onUpdateItem: (id: string, updates: Partial<Omit<MenuItem, 'id'>>) => void;
  onToggleCategory: (id: string) => void;
  onToggleItem: (id: string) => void;
};

const emptyItem = {
  name: '',
  category: '',
  price: 0,
  hpp: 0,
  isActive: true,
};

export function MenuAdmin({
  items,
  categories,
  onAddCategory,
  onAddItem,
  onDeleteCategory,
  onRenameCategory,
  onToggleCategory,
  onUpdateItem,
  onToggleItem,
}: MenuAdminProps) {
  const activeCategoryNames = categories
    .filter((category) => category.isActive)
    .map((category) => category.name);
  const allCategoryNames = categories.map((category) => category.name);
  const [newItemCategory, setNewItemCategory] = useState(
    activeCategoryNames[0] ?? allCategoryNames[0] ?? '',
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<{
    category: MenuCategory;
    itemCount: number;
  } | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const lastDeleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteSubmittedRef = useRef(false);
  const groupedItems = categories.map((category) => ({
    category: category.name,
    categoryRecord: category,
    items: items.filter((item) => item.category === category.name),
  }));

  const handleAddItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const category = newItemCategory.trim();
    const price = toPositiveNumber(formData.get('price'));
    const hpp = toPositiveNumber(formData.get('hpp'));

    if (!name || !category) {
      return;
    }

    onAddItem({
      ...emptyItem,
      name,
      category,
      price,
      hpp,
    });
    event.currentTarget.reset();
    setNewItemCategory(activeCategoryNames[0] ?? allCategoryNames[0] ?? '');
  };

  const handleAddCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newCategoryName.trim()) {
      return;
    }

    onAddCategory(newCategoryName);
    setNewCategoryName('');
  };

  const closeDeleteModal = () => {
    setCategoryToDelete(null);
    setIsDeleteSubmitting(false);
    deleteSubmittedRef.current = false;
    window.setTimeout(() => lastDeleteButtonRef.current?.focus(), 0);
  };

  const confirmDeleteCategory = () => {
    if (!categoryToDelete || deleteSubmittedRef.current) {
      return;
    }

    deleteSubmittedRef.current = true;
    setIsDeleteSubmitting(true);
    onDeleteCategory(categoryToDelete.category.id);
    setCategoryToDelete(null);
    setIsDeleteSubmitting(false);
  };

  return (
    <section className="min-h-full rounded-2xl bg-white/80 backdrop-blur-sm p-4 shadow-elegant border border-santara-latte/40 lg:my-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      {/* Premium Header */}
      <div className="flex flex-col gap-2 border-b border-santara-latte/50 pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-santara-gold">
          Admin
        </p>
        <h2 className="text-2xl font-black text-santara-roast tracking-tight">Kelola Menu</h2>
        <p className="text-sm text-santara-roast/60">
          Edit harga, HPP, kategori, dan status menu. Perubahan baru hanya
          berlaku untuk cart berikutnya.
        </p>
      </div>

      {/* Premium Add Item Form */}
      <form
        className="mt-4 grid gap-3 rounded-2xl bg-santara-foam/50 p-4 border border-santara-latte/30 md:grid-cols-[1.4fr_1fr_140px_140px_auto]"
        onSubmit={handleAddItem}
      >
        <InputField name="name" placeholder="Nama Menu" />
        <CategoryDropdown
          categories={activeCategoryNames}
          label="Kategori"
          onChange={setNewItemCategory}
          value={newItemCategory}
        />
        <InputField name="price" placeholder="Harga" type="number" />
        <InputField name="hpp" placeholder="HPP" type="number" />
        <button
          className="btn-primary px-4 py-3 text-sm font-bold rounded-xl"
          type="submit"
        >
          Tambah
        </button>
      </form>

      {/* Premium Category Management */}
      <section className="mt-4 rounded-2xl bg-santara-foam/50 p-4 border border-santara-latte/30">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-santara-clay">
            Kategori
          </p>
          <h3 className="text-lg font-black text-santara-roast">
            Kelola Kategori Menu
          </h3>
          <p className="text-sm text-santara-roast/60">
            Kategori aktif muncul di tab kasir. Kategori nonaktif dan menunya
            disembunyikan dari kasir.
          </p>
        </div>
        <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleAddCategory}>
          <InputField
            placeholder="Nama kategori baru"
            value={newCategoryName}
            onChange={setNewCategoryName}
          />
          <button
            className="btn-primary px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap"
            type="submit"
          >
            Tambah Kategori
          </button>
        </form>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {groupedItems.map(({ categoryRecord: category, items: categoryItems }) => (
            <article
              className={`grid gap-2 rounded-xl p-2 transition-all ${
                category.isActive ? 'bg-white border border-santara-latte/40' : 'bg-santara-foam/50 border border-dashed border-santara-latte/30 opacity-75'
              }`}
              key={category.id}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
                <InputField
                  ariaLabel={`Nama kategori ${category.name}`}
                  value={category.name}
                  onChange={(value) => onRenameCategory(category.id, value)}
                />
                <button
                  aria-label={category.isActive ? 'Nonaktifkan kategori' : 'Aktifkan kategori'}
                  className={`grid size-10 place-items-center rounded-lg text-sm font-black transition ${
                    category.isActive
                      ? 'bg-santara-bean text-white hover:bg-santara-roast'
                      : 'bg-white text-santara-clay ring-1 ring-santara-latte hover:bg-santara-cream'
                  }`}
                  onClick={() => onToggleCategory(category.id)}
                  title={category.isActive ? 'Aktif' : 'Nonaktif'}
                  type="button"
                >
                  <StatusIcon active={category.isActive} />
                </button>
                <button
                  aria-label={`Hapus kategori ${category.name}`}
                  className="grid size-10 place-items-center rounded-lg bg-white text-santara-clay ring-1 ring-santara-latte transition hover:bg-santara-cream"
                  onClick={(event) => {
                    lastDeleteButtonRef.current = event.currentTarget;
                    deleteSubmittedRef.current = false;
                    setCategoryToDelete({
                      category,
                      itemCount: categoryItems.length,
                    });
                  }}
                  title={
                    categoryItems.length > 0
                      ? 'Hapus kategori dan menu di dalamnya'
                      : 'Hapus kategori'
                  }
                  type="button"
                >
                  <TrashIcon />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-3">
        <div className="space-y-3">
          {groupedItems.map((group) => (
            <section
              className="rounded-lg bg-white p-3 ring-1 ring-santara-latte"
              key={group.category}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-black text-santara-roast">{group.category}</h3>
                <span className="rounded-full bg-santara-cream px-2 py-1 text-xs font-black text-santara-bean">
                  {group.items.length} menu -{' '}
                  {group.categoryRecord.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="space-y-2">
                {group.items.map((item) => (
                  <article
                    className={`grid gap-2 rounded-lg p-2 ring-1 ring-santara-latte md:grid-cols-[1.4fr_1fr_110px_110px_92px_96px] ${
                      item.isActive ? 'bg-santara-foam' : 'bg-santara-cream/60 opacity-75'
                    }`}
                    key={item.id}
                  >
                    <InputField
                      ariaLabel={`Nama Menu ${item.name}`}
                      value={item.name}
                      onChange={(value) => onUpdateItem(item.id, { name: value })}
                    />
                    <CategoryDropdown
                      categories={allCategoryNames}
                      label={`Kategori ${item.name}`}
                      value={item.category}
                      onChange={(category) => onUpdateItem(item.id, { category })}
                    />
                    <InputField
                      ariaLabel={`Harga ${item.name}`}
                      type="number"
                      value={String(item.price)}
                      onChange={(value) =>
                        onUpdateItem(item.id, { price: toPositiveNumber(value) })
                      }
                    />
                    <InputField
                      ariaLabel={`HPP ${item.name}`}
                      type="number"
                      value={String(item.hpp)}
                      onChange={(value) =>
                        onUpdateItem(item.id, { hpp: toPositiveNumber(value) })
                      }
                    />
                    <div className="rounded-lg bg-white px-3 py-2 text-sm font-black ring-1 ring-santara-latte">
                      <span className="block text-[10px] uppercase tracking-[0.1em] text-santara-sage">
                        Margin
                      </span>
                      {formatRupiah(Math.max(item.price - item.hpp, 0))}
                    </div>
                    <button
                      className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                        item.isActive
                          ? 'bg-santara-bean text-white hover:bg-santara-roast'
                          : 'bg-white text-santara-clay ring-1 ring-santara-latte hover:bg-santara-cream'
                      }`}
                      onClick={() => onToggleItem(item.id)}
                      type="button"
                    >
                      {item.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {categoryToDelete && (
        <DeleteCategoryModal
          category={categoryToDelete.category}
          isSubmitting={isDeleteSubmitting}
          itemCount={categoryToDelete.itemCount}
          onCancel={closeDeleteModal}
          onConfirm={confirmDeleteCategory}
        />
      )}
    </section>
  );
}

type CategoryDropdownProps = {
  categories: string[];
  label: string;
  value: string;
  onChange: (category: string) => void;
};

function CategoryDropdown({
  categories,
  label,
  value,
  onChange,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCategory = value || categories[0] || 'Kategori';

  return (
    <div className="relative min-w-0">
      <button
        aria-expanded={isOpen}
        aria-label={label}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm font-black text-santara-roast outline-none ring-1 ring-santara-latte transition hover:bg-santara-cream focus:ring-2 focus:ring-santara-clay"
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
            setIsOpen(false);
          }
        }}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="truncate">{selectedCategory}</span>
        <span className={`text-santara-clay transition ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronIcon />
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-lg bg-white p-1 shadow-soft ring-1 ring-santara-latte">
          {categories.map((category) => (
            <button
              className={`w-full rounded-md px-3 py-2 text-left text-sm font-black transition ${
                category === selectedCategory
                  ? 'bg-santara-bean text-white'
                  : 'text-santara-roast hover:bg-santara-cream'
              }`}
              key={category}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(category);
                setIsOpen(false);
              }}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type InputFieldProps = {
  name?: string;
  placeholder?: string;
  type?: 'text' | 'number';
  value?: string;
  ariaLabel?: string;
  onChange?: (value: string) => void;
};

function InputField({
  name,
  placeholder,
  type = 'text',
  value,
  ariaLabel,
  onChange,
}: InputFieldProps) {
  return (
    <input
      aria-label={ariaLabel ?? placeholder}
      className="min-w-0 rounded-lg bg-white px-3 py-2 text-sm font-bold text-santara-roast outline-none ring-1 ring-santara-latte transition placeholder:text-santara-roast/35 focus:ring-2 focus:ring-santara-clay"
      inputMode={type === 'number' ? 'numeric' : undefined}
      min={type === 'number' ? '0' : undefined}
      name={name}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      type={type}
      value={value}
    />
  );
}

type DeleteCategoryModalProps = {
  category: MenuCategory;
  isSubmitting: boolean;
  itemCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

function DeleteCategoryModal({
  category,
  isSubmitting,
  itemCount,
  onCancel,
  onConfirm,
}: DeleteCategoryModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      aria-labelledby="delete-category-title"
      aria-modal="true"
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-santara-roast/55 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
    >
      <div
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-santara-foam p-4 shadow-elegant ring-1 ring-santara-latte sm:max-h-[calc(100dvh-2rem)] sm:p-5"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
      >
        <p className="text-xs font-black uppercase tracking-[0.14em] text-santara-clay">
          Hapus Kategori
        </p>
        <h2
          className="mt-1 text-xl font-black leading-tight text-santara-roast sm:text-2xl"
          id="delete-category-title"
        >
          Hapus kategori "{category.name}"?
        </h2>
        <div className="mt-3 space-y-2 text-sm font-semibold leading-relaxed text-santara-roast/70">
          <p>
            {itemCount > 0
              ? `Kategori ini berisi ${itemCount} menu. Semua menu di dalam kategori ini juga akan dihapus.`
              : 'Kategori ini akan dihapus dari daftar kategori.'}
          </p>
          <p>
            Tindakan ini akan disinkronkan ke Supabase dan tidak dapat
            dibatalkan setelah sinkronisasi selesai.
          </p>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-11 rounded-xl bg-white px-4 py-3 text-sm font-black text-santara-clay ring-1 ring-santara-latte transition hover:bg-santara-cream"
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Batal
          </button>
          <button
            className="min-h-11 rounded-xl bg-santara-bean px-4 py-3 text-sm font-black text-white shadow-soft transition hover:bg-santara-roast disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            Hapus Kategori
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function StatusIcon({ active }: { active: boolean }) {
  return active ? (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function toPositiveNumber(value: FormDataEntryValue | string | null) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}
