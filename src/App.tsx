import { useMemo, useState } from 'react';
import { CheckoutModal } from './components/CheckoutModal';
import { ReceiptPreview } from './components/ReceiptPreview';
import { menuCategories } from './data/menu';
import type { CartItem, CompletedTransaction, MenuItem } from './types';
import { formatCompactDate, formatRupiah } from './utils/format';

const CASHIER_NAME = 'Santara Cashier';

function createReceiptNumber(date: Date, sequence: number) {
  return `SAN-${formatCompactDate(date)}-${String(sequence).padStart(3, '0')}`;
}

function App() {
  const [activeCategoryId, setActiveCategoryId] = useState(menuCategories[0].id);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedTransactions, setCompletedTransactions] = useState<
    CompletedTransaction[]
  >([]);

  const latestTransaction = completedTransactions[completedTransactions.length - 1];
  const activeCategory =
    menuCategories.find((category) => category.id === activeCategoryId) ??
    menuCategories[0];

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + item.unitPriceSnapshot * item.quantity,
        0,
      ),
    [cart],
  );

  const totalQuantity = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart],
  );

  const addItem = (item: MenuItem) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((cartItem) => cartItem.id === item.id);

      if (existingItem) {
        return currentCart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }

      return [
        ...currentCart,
        {
          id: item.id,
          nameSnapshot: item.name,
          categorySnapshot: item.category,
          unitPriceSnapshot: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const increaseQuantity = (id: string) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const decreaseQuantity = (id: string) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(item.quantity - 1, 0) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const completeCheckout = (
    checkout: Pick<
      CompletedTransaction,
      | 'discountType'
      | 'discountValue'
      | 'discountAmount'
      | 'totalAfterDiscount'
      | 'paymentMethod'
      | 'paidAmount'
      | 'changeAmount'
    >,
  ) => {
    const completedAt = new Date();
    const transaction: CompletedTransaction = {
      receiptNumber: createReceiptNumber(
        completedAt,
        completedTransactions.length + 1,
      ),
      dateTime: completedAt.toISOString(),
      cashierName: CASHIER_NAME,
      items: cart.map((item) => ({
        ...item,
        subtotal: item.unitPriceSnapshot * item.quantity,
      })),
      subtotalBeforeDiscount: subtotal,
      ...checkout,
    };

    setCompletedTransactions((transactions) => [...transactions, transaction]);
    setCart([]);
    setIsCheckoutOpen(false);
  };

  return (
    <main className="min-h-screen bg-santara-cream text-santara-roast">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-santara-latte/80 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-full bg-santara-bean text-lg font-black text-white shadow-soft">
              SC
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-santara-clay">
                Santara POS
              </p>
              <h1 className="font-display text-3xl font-black text-santara-roast sm:text-4xl">
                Santara Coffee
              </h1>
              <p className="mt-1 text-sm font-medium text-santara-roast/70 sm:text-base">
                Ruang untuk cerita, jeda untuk jiwa
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[580px]">
            <StatusTile label="Mode" value="Cashier" />
            <StatusTile label="Cart" value={`${totalQuantity} item`} />
            <StatusTile label="Subtotal" value={formatRupiah(subtotal)} wide />
            <StatusTile
              label="Last Receipt"
              value={latestTransaction?.receiptNumber ?? '-'}
              wide
            />
          </div>
        </header>

        <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="flex min-h-0 flex-col rounded-lg bg-santara-foam/80 p-3 shadow-soft ring-1 ring-santara-latte/70 sm:p-4">
            <div className="flex flex-col gap-3 border-b border-santara-latte/70 pb-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Menu</h2>
                  <p className="text-sm text-santara-roast/65">
                    Pilih kategori lalu tap menu untuk menambah pesanan.
                  </p>
                </div>
                <p className="hidden rounded-full bg-white px-3 py-1 text-sm font-bold text-santara-bean ring-1 ring-santara-latte sm:block">
                  {activeCategory.items.length} menu
                </p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {menuCategories.map((category) => {
                  const isActive = category.id === activeCategoryId;

                  return (
                    <button
                      className={`shrink-0 rounded-full px-4 py-3 text-sm font-black transition ${
                        isActive
                          ? 'bg-santara-bean text-white shadow-soft'
                          : 'bg-white text-santara-roast ring-1 ring-santara-latte hover:bg-santara-latte/40'
                      }`}
                      key={category.id}
                      onClick={() => setActiveCategoryId(category.id)}
                      type="button"
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto py-4 sm:grid-cols-3 xl:grid-cols-4">
              {activeCategory.items.map((item) => (
                <button
                  className="flex min-h-32 flex-col justify-between rounded-lg bg-white p-4 text-left shadow-sm ring-1 ring-santara-latte transition hover:-translate-y-0.5 hover:bg-santara-cream focus:outline-none focus:ring-2 focus:ring-santara-clay"
                  key={item.id}
                  onClick={() => addItem(item)}
                  type="button"
                >
                  <span>
                    <span className="block text-base font-black leading-tight text-santara-roast">
                      {item.name}
                    </span>
                    <span className="mt-2 block text-xs font-bold uppercase tracking-[0.1em] text-santara-sage">
                      {item.category}
                    </span>
                  </span>
                  <span className="mt-4 block text-lg font-black text-santara-bean">
                    {formatRupiah(item.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <aside className="flex min-h-[520px] flex-col rounded-lg bg-white shadow-soft ring-1 ring-santara-latte">
            <div className="flex items-center justify-between gap-3 border-b border-santara-latte px-4 py-4">
              <div>
                <h2 className="text-xl font-black">Cart</h2>
                <p className="text-sm text-santara-roast/65">
                  Review pesanan, beri diskon, lalu selesaikan pembayaran.
                </p>
              </div>
              <button
                className="rounded-full px-3 py-2 text-sm font-black text-santara-clay ring-1 ring-santara-latte transition hover:bg-santara-cream disabled:cursor-not-allowed disabled:opacity-40"
                disabled={cart.length === 0}
                onClick={clearCart}
                type="button"
              >
                Clear
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {cart.length === 0 ? (
                <div className="grid h-full min-h-72 place-items-center rounded-lg border border-dashed border-santara-latte bg-santara-cream/70 p-6 text-center">
                  <div>
                    <p className="text-lg font-black">Cart masih kosong</p>
                    <p className="mt-2 text-sm text-santara-roast/65">
                      Tap menu favorit pelanggan untuk mulai membuat pesanan.
                    </p>
                    {latestTransaction && (
                      <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm font-bold text-santara-bean ring-1 ring-santara-latte">
                        Last completed: {latestTransaction.receiptNumber}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      className="rounded-lg border border-santara-latte bg-santara-foam p-3"
                      key={item.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black leading-tight">
                            {item.nameSnapshot}
                          </p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-santara-sage">
                            {item.categorySnapshot}
                          </p>
                          <p className="mt-2 text-sm font-bold text-santara-bean">
                            {formatRupiah(item.unitPriceSnapshot)} / item
                          </p>
                        </div>
                        <button
                          aria-label={`Remove ${item.nameSnapshot}`}
                          className="rounded-full px-3 py-1 text-sm font-black text-santara-clay ring-1 ring-santara-latte transition hover:bg-white"
                          onClick={() => removeItem(item.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-full bg-white p-1 ring-1 ring-santara-latte">
                          <button
                            aria-label={`Decrease ${item.nameSnapshot}`}
                            className="grid size-10 place-items-center rounded-full text-xl font-black text-santara-bean transition hover:bg-santara-latte/60"
                            onClick={() => decreaseQuantity(item.id)}
                            type="button"
                          >
                            -
                          </button>
                          <span className="min-w-12 text-center text-lg font-black">
                            {item.quantity}
                          </span>
                          <button
                            aria-label={`Increase ${item.nameSnapshot}`}
                            className="grid size-10 place-items-center rounded-full bg-santara-bean text-xl font-black text-white transition hover:bg-santara-roast"
                            onClick={() => increaseQuantity(item.id)}
                            type="button"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-lg font-black text-santara-roast">
                          {formatRupiah(item.unitPriceSnapshot * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {latestTransaction && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black">Receipt Preview</h3>
                    <button
                      className="rounded-full bg-santara-bean px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-santara-roast"
                      onClick={() => window.print()}
                      type="button"
                    >
                      Print Receipt
                    </button>
                  </div>
                  <ReceiptPreview transaction={latestTransaction} />
                </div>
              )}
            </div>

            <div className="border-t border-santara-latte bg-santara-cream/80 px-4 py-4">
              <div className="flex items-center justify-between text-sm font-bold text-santara-roast/70">
                <span>Total item</span>
                <span>{totalQuantity}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-black">Subtotal</span>
                <span className="text-2xl font-black text-santara-bean">
                  {formatRupiah(subtotal)}
                </span>
              </div>
              <button
                className="mt-4 w-full rounded-lg bg-santara-bean px-5 py-4 text-lg font-black text-white shadow-soft transition hover:bg-santara-roast disabled:cursor-not-allowed disabled:opacity-45"
                disabled={cart.length === 0}
                onClick={() => setIsCheckoutOpen(true)}
                type="button"
              >
                Checkout
              </button>
            </div>
          </aside>
        </section>
      </div>

      {isCheckoutOpen && (
        <CheckoutModal
          onClose={() => setIsCheckoutOpen(false)}
          onComplete={completeCheckout}
          subtotal={subtotal}
        />
      )}
    </main>
  );
}

type StatusTileProps = {
  label: string;
  value: string;
  wide?: boolean;
};

function StatusTile({ label, value, wide = false }: StatusTileProps) {
  return (
    <div
      className={`rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-santara-latte ${
        wide ? 'col-span-2 sm:col-span-1' : ''
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-santara-sage">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-santara-roast">{value}</p>
    </div>
  );
}

export default App;
