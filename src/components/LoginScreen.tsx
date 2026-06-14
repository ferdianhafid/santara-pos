type LoginScreenProps = {
  errorMessage: string;
  isLoading: boolean;
  onSubmit: (email: string, password: string) => void;
};

export function LoginScreen({
  errorMessage,
  isLoading,
  onSubmit,
}: LoginScreenProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      return;
    }

    onSubmit(email, password);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-santara-cream px-4 py-8 text-santara-roast">
      <section className="w-full max-w-md rounded-xl bg-santara-foam p-5 shadow-soft ring-1 ring-santara-latte sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-santara-bean text-base font-black text-white shadow-soft">
            SC
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-santara-clay">
              Santara POS
            </p>
            <h1 className="font-display text-2xl font-black leading-tight">
              Login Santara POS
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm font-medium leading-relaxed text-santara-roast/70">
          Masuk dengan akun Supabase yang sudah dibuat untuk Santara Coffee.
          Setelah login, data lokal tetap aman dan sync cloud berjalan otomatis.
        </p>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-santara-sage">
              Email
            </span>
            <input
              autoComplete="email"
              className="mt-1 w-full rounded-lg bg-white px-3 py-3 text-sm font-bold outline-none ring-1 ring-santara-latte transition placeholder:text-santara-roast/35 focus:ring-2 focus:ring-santara-clay"
              name="email"
              placeholder="owner@santara.coffee"
              type="email"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-santara-sage">
              Password
            </span>
            <input
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg bg-white px-3 py-3 text-sm font-bold outline-none ring-1 ring-santara-latte transition placeholder:text-santara-roast/35 focus:ring-2 focus:ring-santara-clay"
              name="password"
              placeholder="Password"
              type="password"
            />
          </label>

          {errorMessage && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              {errorMessage}
            </p>
          )}

          <button
            className="w-full rounded-lg bg-santara-bean px-5 py-3 text-base font-black text-white shadow-soft transition hover:bg-santara-roast disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </section>
    </main>
  );
}
