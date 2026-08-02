import { useCallback, useEffect, useState } from 'react';
import { canUseSupabase } from '../services/supabaseData';
import {
  fetchStaffMembers,
  manageStaff,
  type StaffMember,
} from '../services/staffManagement';
import type { UserRole } from '../services/supabaseAuth';

type StaffManagementProps = {
  currentUserId: string;
  currentUserRole: UserRole;
};

type StaffForm = {
  email: string;
  fullName: string;
  password: string;
  role: 'admin' | 'cashier';
};

const emptyForm: StaffForm = {
  email: '',
  fullName: '',
  password: '',
  role: 'cashier',
};

export function StaffManagement({
  currentUserId,
  currentUserRole,
}: StaffManagementProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(canUseSupabase());
  const [pendingId, setPendingId] = useState('');
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStaff = useCallback(async () => {
    if (!canUseSupabase()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setStaff(await fetchStaffMembers());
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Daftar staff gagal dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const runAction = async (
    id: string,
    payload: Record<string, unknown>,
  ) => {
    setPendingId(id);
    setMessage('');
    setError('');
    try {
      setMessage(await manageStaff(payload));
      await loadStaff();
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Perubahan gagal disimpan.');
      return false;
    } finally {
      setPendingId('');
    }
  };

  const createStaff = async () => {
    const success = await runAction('create', { action: 'create', ...form });
    if (success) {
      setForm(emptyForm);
      setIsAdding(false);
    }
  };

  return (
    <section className="rounded-lg bg-white p-3 ring-1 ring-santara-latte">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-santara-clay">
            Akses Tim
          </p>
          <h3 className="mt-1 text-lg font-black text-santara-roast">Kelola Staff</h3>
          <p className="mt-1 text-sm text-santara-roast/60">
            Buat akun kasir atau admin khusus untuk kafe ini.
          </p>
        </div>
        <button
          className="rounded-lg bg-santara-bean px-3 py-2 text-xs font-black text-white shadow-soft transition hover:bg-santara-roast disabled:opacity-45"
          disabled={!canUseSupabase()}
          onClick={() => setIsAdding((value) => !value)}
          type="button"
        >
          {isAdding ? 'Batal' : '+ Tambah Staff'}
        </button>
      </div>

      {!canUseSupabase() && (
        <p className="mt-3 rounded-lg bg-santara-cream px-3 py-2 text-xs font-bold text-santara-roast/65">
          Kelola staff tersedia saat aplikasi terhubung ke Supabase.
        </p>
      )}

      {message && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {isAdding && (
        <div className="mt-3 grid gap-2 rounded-lg bg-santara-cream/70 p-3 ring-1 ring-santara-latte sm:grid-cols-2">
          <StaffInput
            label="Nama lengkap"
            onChange={(fullName) => setForm((current) => ({ ...current, fullName }))}
            placeholder="Nama staff"
            value={form.fullName}
          />
          <StaffInput
            label="Email login"
            onChange={(email) => setForm((current) => ({ ...current, email }))}
            placeholder="staff@kafe.com"
            type="email"
            value={form.email}
          />
          <StaffInput
            label="Password sementara"
            onChange={(password) => setForm((current) => ({ ...current, password }))}
            placeholder="Minimal 8 karakter"
            type="password"
            value={form.password}
          />
          <label className="block">
            <span className="text-xs font-black text-santara-roast/70">Role</span>
            <select
              className="mt-1 w-full rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-santara-roast outline-none ring-1 ring-santara-latte focus:ring-2 focus:ring-santara-clay"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value as StaffForm['role'],
                }))
              }
              value={form.role}
            >
              <option value="cashier">Kasir</option>
              {currentUserRole === 'owner' && <option value="admin">Admin</option>}
            </select>
          </label>
          <button
            className="rounded-lg bg-santara-bean px-4 py-2.5 text-sm font-black text-white disabled:opacity-45 sm:col-span-2"
            disabled={
              pendingId === 'create' ||
              !form.fullName.trim() ||
              !form.email.trim() ||
              form.password.length < 8
            }
            onClick={() => void createStaff()}
            type="button"
          >
            {pendingId === 'create' ? 'Membuat akun...' : 'Buat Akun Staff'}
          </button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {isLoading ? (
          <p className="py-4 text-center text-sm font-bold text-santara-roast/50">Memuat staff...</p>
        ) : (
          staff.map((member) => {
            const isSelf = member.id === currentUserId;
            const canManage =
              !isSelf &&
              member.role !== 'owner' &&
              (currentUserRole === 'owner' || member.role === 'cashier');

            return (
              <article
                className="rounded-lg bg-santara-cream/55 px-3 py-2.5 ring-1 ring-santara-latte"
                key={member.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-santara-roast">{member.fullName}</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase text-santara-bean ring-1 ring-santara-latte">
                        {member.role === 'cashier' ? 'Kasir' : member.role === 'admin' ? 'Admin' : 'Owner'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${member.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                        {member.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-semibold text-santara-roast/55">{member.email}</p>
                  </div>

                  {canManage ? (
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        className="rounded-lg bg-white px-2.5 py-2 text-[11px] font-black text-santara-bean ring-1 ring-santara-latte disabled:opacity-45"
                        disabled={pendingId === member.id}
                        onClick={() => {
                          setResetTarget(member);
                          setNewPassword('');
                        }}
                        type="button"
                      >
                        Password
                      </button>
                      <button
                        className={`rounded-lg px-2.5 py-2 text-[11px] font-black ring-1 disabled:opacity-45 ${member.isActive ? 'bg-white text-red-600 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}
                        disabled={pendingId === member.id}
                        onClick={() => {
                          if (
                            member.isActive &&
                            !window.confirm(`Nonaktifkan akun ${member.fullName}? Staff ini tidak akan bisa mengakses data kafe.`)
                          ) {
                            return;
                          }
                          void runAction(member.id, {
                            action: 'update',
                            fullName: member.fullName,
                            isActive: !member.isActive,
                            role: member.role,
                            staffId: member.id,
                          });
                        }}
                        type="button"
                      >
                        {member.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-santara-roast/45">
                      {isSelf ? 'Akun Anda' : 'Dilindungi'}
                    </span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-santara-roast/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-elegant">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-santara-clay">Reset Password</p>
            <h3 className="mt-1 text-xl font-black text-santara-roast">{resetTarget.fullName}</h3>
            <StaffInput
              label="Password baru"
              onChange={setNewPassword}
              placeholder="Minimal 8 karakter"
              type="password"
              value={newPassword}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="rounded-lg bg-white px-3 py-2.5 text-sm font-black text-santara-clay ring-1 ring-santara-latte"
                onClick={() => setResetTarget(null)}
                type="button"
              >
                Batal
              </button>
              <button
                className="rounded-lg bg-santara-bean px-3 py-2.5 text-sm font-black text-white disabled:opacity-45"
                disabled={newPassword.length < 8 || pendingId === resetTarget.id}
                onClick={async () => {
                  const success = await runAction(resetTarget.id, {
                    action: 'reset_password',
                    password: newPassword,
                    staffId: resetTarget.id,
                  });
                  if (success) setResetTarget(null);
                }}
                type="button"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StaffInput({
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="mt-2 block first:mt-0">
      <span className="text-xs font-black text-santara-roast/70">{label}</span>
      <input
        className="mt-1 w-full rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-santara-roast outline-none ring-1 ring-santara-latte focus:ring-2 focus:ring-santara-clay"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}
