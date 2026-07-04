import { useState } from 'react';
import { LocalDataPanel } from './LocalDataPanel';
import type { AppStateData, MenuCategory, MenuItem } from '../types';
import { formatRupiah } from '../utils/format';

type MenuAdminProps = {
  items: MenuItem[];
  categories: MenuCategory[];
  appData: AppStateData;
  defaultMenuItems: MenuItem[];
  onAddCategory: (name: string) => void;
  onAddItem: (item: Omit<MenuItem, 'id'>) => void;
  onImportData: (data: AppStateData) => void;
  onResetData: () => void;
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
  appData,
  defaultMenuItems,
  onAddCategory,
  onAddItem,
  onImportData,
  onResetData,
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
  const groupedItems = categories.map((category) => ({
    category: category.name,
    categoryRecord: category,
    items: items.filter((item) => item.category === category.name),
  }));

  const handleAddItem = (event: React.FormEvent<HTMLFormElement>) => {
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

  const handleAddCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newCategoryName.trim()) {
      return;
    }

    onAddCategory(newCategoryName);
    setNewCategoryName('');
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
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {categories.map((category) => (
            <article
              className={`grid gap-2 rounded-xl p-3 transition-all ${
                category.isActive ? 'bg-white border border-santara-latte/40' : 'bg-santara-foam/50 border border-dashed border-santara-latte/30 opacity-75'
              }`}
              key={category.id}
            >
              <InputField
                ariaLabel={`Nama kategori ${category.name}`}
                value={category.name}
                onChange={(value) => onRenameCategory(category.id, value)}
              />
              <button
                className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                  category.isActive
                    ? 'bg-santara-bean text-white hover:bg-santara-roast'
                    : 'bg-white text-santara-clay ring-1 ring-santara-latte hover:bg-santara-cream'
                }`}
                onClick={() => onToggleCategory(category.id)}
                type="button"
              >
                {category.isActive ? 'Aktif' : 'Nonaktif'}
              </button>
            </article>
          ))}
        </div>
      </section>

      <LocalDataPanel
        appData={appData}
        defaultMenuItems={defaultMenuItems}
        onImportData={onImportData}
        onResetData={onResetData}
      />

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
                    className={`grid gap-2 rounded-lg p-2 ring-1 ring-santara-latte lg:grid-cols-[1.4fr_1fr_110px_110px_92px_96px] ${
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
        <span className="text-xs text-santara-clay">{isOpen ? 'Up' : 'Down'}</span>
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

function toPositiveNumber(value: FormDataEntryValue | string | null) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}
