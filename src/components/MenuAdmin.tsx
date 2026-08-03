import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  type SetStateAction,
} from 'react';
import { createPortal } from 'react-dom';
import type { MenuCategory, MenuItem, MenuSize, MenuSizeVariant } from '../types';
import { formatRupiah } from '../utils/format';
import { getMenuSizeVariants } from '../utils/menuVariants';

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
  sizeVariants: [],
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
  const [newItemUsesSizes, setNewItemUsesSizes] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [openCategoryEditors, setOpenCategoryEditors] = useState<string[]>([]);
  const [openMenuGroups, setOpenMenuGroups] = useState<string[]>([]);
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
  const normalizedMenuSearch = menuSearch.trim().toLocaleLowerCase('id-ID');
  const filteredGroupedItems = groupedItems
    .map((group) => ({
      ...group,
      items: normalizedMenuSearch
        ? group.items.filter((item) =>
            `${item.name} ${item.category}`
              .toLocaleLowerCase('id-ID')
              .includes(normalizedMenuSearch),
          )
        : group.items,
    }))
    .filter((group) => !normalizedMenuSearch || group.items.length > 0);

  const toggleOpenId = (
    id: string,
    setter: Dispatch<SetStateAction<string[]>>,
  ) => {
    setter((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    );
  };

  const handleAddItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const category = newItemCategory.trim();
    const priceM = toPositiveNumber(
      formData.get(newItemUsesSizes ? 'priceM' : 'price'),
    );
    const hppM = toPositiveNumber(
      formData.get(newItemUsesSizes ? 'hppM' : 'hpp'),
    );
    const sizeVariants: MenuSizeVariant[] = newItemUsesSizes
      ? [
          { size: 'M', price: priceM, hpp: hppM },
          {
            size: 'L',
            price: toPositiveNumber(formData.get('priceL')),
            hpp: toPositiveNumber(formData.get('hppL')),
          },
        ]
      : [];

    if (!name || !category) {
      return;
    }

    onAddItem({
      ...emptyItem,
      name,
      category,
      price: priceM,
      hpp: hppM,
      sizeVariants,
    });
    event.currentTarget.reset();
    setNewItemUsesSizes(false);
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
        className="mt-4 grid gap-3 rounded-2xl bg-santara-foam/50 p-4 border border-santara-latte/30 md:grid-cols-2 xl:grid-cols-6"
        onSubmit={handleAddItem}
      >
        <InputField name="name" placeholder="Nama Menu" />
        <CategoryDropdown
          categories={activeCategoryNames}
          label="Kategori"
          onChange={setNewItemCategory}
          value={newItemCategory}
        />
        <SizeModeSelect
          onChange={setNewItemUsesSizes}
          usesSizes={newItemUsesSizes}
        />
        {newItemUsesSizes ? (
          <>
            <InputField name="priceM" placeholder="Harga M" type="number" />
            <InputField name="hppM" placeholder="HPP M" type="number" />
            <InputField name="priceL" placeholder="Harga L" type="number" />
            <InputField name="hppL" placeholder="HPP L" type="number" />
          </>
        ) : (
          <>
            <InputField name="price" placeholder="Harga" type="number" />
            <InputField name="hpp" placeholder="HPP" type="number" />
          </>
        )}
        <button
          className="btn-primary px-4 py-3 text-sm font-bold rounded-xl xl:col-span-1"
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
          {groupedItems.map(({ categoryRecord: category, items: categoryItems }) => {
            const isCategoryEditorOpen = openCategoryEditors.includes(category.id);

            return (
              <article
                className={`overflow-hidden rounded-xl border transition-colors ${
                  category.isActive
                    ? 'border-santara-latte/40 bg-white'
                    : 'border-dashed border-santara-latte/40 bg-santara-foam/50 opacity-80'
                }`}
                key={category.id}
              >
                <button
                  aria-expanded={isCategoryEditorOpen}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-santara-cream/55"
                  onClick={() => toggleOpenId(category.id, setOpenCategoryEditors)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-santara-roast">{category.name}</span>
                    <span className="mt-0.5 block text-[10px] font-bold text-santara-roast/55">
                      {categoryItems.length} menu · {category.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </span>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full bg-santara-cream text-santara-bean transition-transform duration-200 ${isCategoryEditorOpen ? 'rotate-180' : ''}`}>
                    <ChevronIcon />
                  </span>
                </button>

                {isCategoryEditorOpen && (
                  <div className="accordion-reveal grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-t border-santara-latte/60 p-2">
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
                        setCategoryToDelete({ category, itemCount: categoryItems.length });
                      }}
                      title={categoryItems.length > 0 ? 'Hapus kategori dan menu di dalamnya' : 'Hapus kategori'}
                      type="button"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-3">
        <div className="mb-3 rounded-xl border border-santara-latte/50 bg-white p-2.5">
          <label className="relative block">
            <span className="sr-only">Cari menu</span>
            <svg aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-santara-sage" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              className="w-full rounded-lg bg-santara-cream/55 py-2.5 pl-9 pr-9 text-sm font-bold text-santara-roast outline-none ring-1 ring-santara-latte transition placeholder:text-santara-roast/40 focus:bg-white focus:ring-2 focus:ring-santara-clay"
              onChange={(event) => setMenuSearch(event.target.value)}
              placeholder="Cari nama menu atau kategori..."
              type="search"
              value={menuSearch}
            />
            {menuSearch && (
              <button
                aria-label="Hapus pencarian"
                className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-santara-clay hover:bg-white"
                onClick={() => setMenuSearch('')}
                type="button"
              >
                <svg aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </label>
        </div>

        <div className="space-y-3">
          {filteredGroupedItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-santara-latte bg-white px-4 py-8 text-center">
              <p className="text-sm font-black text-santara-roast">Menu tidak ditemukan</p>
              <p className="mt-1 text-xs font-medium text-santara-roast/55">Coba kata pencarian atau kategori lain.</p>
            </div>
          ) : filteredGroupedItems.map((group) => {
            const isGroupOpen = normalizedMenuSearch
              ? true
              : openMenuGroups.includes(group.categoryRecord.id);

            return (
              <section className="overflow-hidden rounded-xl bg-white ring-1 ring-santara-latte" key={group.category}>
                <button
                  aria-expanded={isGroupOpen}
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-santara-cream/45"
                  onClick={() => toggleOpenId(group.categoryRecord.id, setOpenMenuGroups)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-black text-santara-roast">{group.category}</span>
                    <span className="mt-0.5 block text-[10px] font-bold text-santara-roast/50">
                      {group.categoryRecord.isActive ? 'Kategori aktif' : 'Kategori nonaktif'}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-santara-cream px-2.5 py-1 text-xs font-black text-santara-bean">{group.items.length} menu</span>
                    <span className={`grid size-8 place-items-center rounded-full bg-santara-cream text-santara-bean transition-transform duration-200 ${isGroupOpen ? 'rotate-180' : ''}`}>
                      <ChevronIcon />
                    </span>
                  </span>
                </button>

                {isGroupOpen && (
                  <div className="accordion-reveal space-y-2 border-t border-santara-latte/60 bg-santara-foam/35 p-2.5 sm:p-3">
                    {group.items.map((item) => (
                      <MenuItemEditor
                        allCategoryNames={allCategoryNames}
                        item={item}
                        key={item.id}
                        onToggle={() => onToggleItem(item.id)}
                        onUpdate={(updates) => onUpdateItem(item.id, updates)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
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

function MenuItemEditor({
  allCategoryNames,
  item,
  onToggle,
  onUpdate,
}: {
  allCategoryNames: string[];
  item: MenuItem;
  onToggle: () => void;
  onUpdate: (updates: Partial<Omit<MenuItem, 'id'>>) => void;
}) {
  const variants = getMenuSizeVariants(item);
  const usesSizes = variants.length > 0;
  const [isOpen, setIsOpen] = useState(false);
  const startingPrice = usesSizes
    ? Math.min(...variants.map((variant) => variant.price))
    : item.price;

  const updateVariant = (
    size: MenuSize,
    field: 'price' | 'hpp',
    value: string,
  ) => {
    const nextVariants = variants.map((variant) =>
      variant.size === size
        ? { ...variant, [field]: toPositiveNumber(value) }
        : variant,
    );
    const medium = nextVariants.find((variant) => variant.size === 'M');
    onUpdate({
      sizeVariants: nextVariants,
      price: medium?.price ?? item.price,
      hpp: medium?.hpp ?? item.hpp,
    });
  };

  const setUsesSizes = (enabled: boolean) => {
    if (enabled) {
      onUpdate({
        sizeVariants: [
          { size: 'M', price: item.price, hpp: item.hpp },
          { size: 'L', price: item.price, hpp: item.hpp },
        ],
      });
      return;
    }

    const medium = variants.find((variant) => variant.size === 'M');
    onUpdate({
      sizeVariants: [],
      price: medium?.price ?? item.price,
      hpp: medium?.hpp ?? item.hpp,
    });
  };

  return (
    <article
      className={`overflow-hidden rounded-xl ring-1 ring-santara-latte ${
        item.isActive ? 'bg-santara-foam' : 'bg-santara-cream/60 opacity-75'
      }`}
    >
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-white/65"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-santara-roast">{item.name}</span>
          <span className="mt-0.5 block truncate text-[10px] font-bold text-santara-roast/55">
            {usesSizes ? variants.map((variant) => variant.size).join(' · ') : 'Tanpa ukuran'} · Mulai {formatRupiah(startingPrice)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-[10px] font-black ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
            {item.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
          <span className={`grid size-8 place-items-center rounded-full bg-white text-santara-bean shadow-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronIcon />
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="accordion-reveal border-t border-santara-latte/60 bg-white/55 p-2.5 sm:p-3">
      <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_150px_96px]">
        <InputField
          ariaLabel={`Nama Menu ${item.name}`}
          value={item.name}
          onChange={(value) => onUpdate({ name: value })}
        />
        <CategoryDropdown
          categories={allCategoryNames}
          label={`Kategori ${item.name}`}
          value={item.category}
          onChange={(category) => onUpdate({ category })}
        />
        <SizeModeSelect onChange={setUsesSizes} usesSizes={usesSizes} />
        <button
          className={`rounded-lg px-3 py-2 text-sm font-black transition ${
            item.isActive
              ? 'bg-santara-bean text-white hover:bg-santara-roast'
              : 'bg-white text-santara-clay ring-1 ring-santara-latte hover:bg-santara-cream'
          }`}
          onClick={onToggle}
          type="button"
        >
          {item.isActive ? 'Aktif' : 'Nonaktif'}
        </button>
      </div>

          {usesSizes ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {variants.map((variant) => (
            <div
              className="grid gap-2 rounded-lg bg-white p-2 ring-1 ring-santara-latte sm:grid-cols-[42px_1fr_1fr_auto]"
              key={variant.size}
            >
              <span className="grid place-items-center rounded-lg bg-santara-bean text-lg font-black text-white">
                {variant.size}
              </span>
              <InputField
                ariaLabel={`Harga ${item.name} ${variant.size}`}
                type="number"
                value={String(variant.price)}
                onChange={(value) => updateVariant(variant.size, 'price', value)}
              />
              <InputField
                ariaLabel={`HPP ${item.name} ${variant.size}`}
                type="number"
                value={String(variant.hpp)}
                onChange={(value) => updateVariant(variant.size, 'hpp', value)}
              />
              <div className="rounded-lg bg-santara-cream px-3 py-2 text-xs font-black">
                <span className="block text-[9px] uppercase text-santara-sage">Margin</span>
                {formatRupiah(Math.max(variant.price - variant.hpp, 0))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <InputField
            ariaLabel={`Harga ${item.name}`}
            type="number"
            value={String(item.price)}
            onChange={(value) => onUpdate({ price: toPositiveNumber(value) })}
          />
          <InputField
            ariaLabel={`HPP ${item.name}`}
            type="number"
            value={String(item.hpp)}
            onChange={(value) => onUpdate({ hpp: toPositiveNumber(value) })}
          />
          <div className="rounded-lg bg-white px-3 py-2 text-sm font-black ring-1 ring-santara-latte">
            <span className="block text-[10px] uppercase tracking-[0.1em] text-santara-sage">Margin</span>
            {formatRupiah(Math.max(item.price - item.hpp, 0))}
          </div>
        </div>
          )}
        </div>
      )}
    </article>
  );
}

function SizeModeSelect({
  onChange,
  usesSizes,
}: {
  onChange: (usesSizes: boolean) => void;
  usesSizes: boolean;
}) {
  return (
    <select
      aria-label="Mode ukuran menu"
      className="min-w-0 rounded-lg bg-white px-3 py-2 text-sm font-black text-santara-roast outline-none ring-1 ring-santara-latte focus:ring-2 focus:ring-santara-clay"
      onChange={(event) => onChange(event.target.value === 'sizes')}
      value={usesSizes ? 'sizes' : 'none'}
    >
      <option value="none">Tanpa ukuran</option>
      <option value="sizes">Ukuran M &amp; L</option>
    </select>
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
