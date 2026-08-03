import { useState, type ReactNode } from 'react';
import { getBusinessBySlug, type BusinessSlug } from '../config/businesses';
import { GoogleSheetSync } from './GoogleSheetSync';
import { LegacyImport } from './LegacyImport';
import { LocalDataPanel } from './LocalDataPanel';
import { PrinterSettingsPanel } from './PrinterSettings';
import { StaffManagement } from './StaffManagement';
import type { UserRole } from '../services/supabaseAuth';
import type {
  AppStateData,
  CompletedTransaction,
  DailyClosing,
  Expense,
  GoogleSheetSyncLog,
  GoogleSheetSyncSettings,
  LegacyImportBatch,
  LegacySale,
  MenuItem,
} from '../types';
import { buildSalesReport } from '../utils/reports';

type SettingsProps = {
  appData: AppStateData;
  businessSlug: BusinessSlug;
  currentUserName: string;
  currentUserId: string;
  currentUserRole: UserRole;
  dailyClosings: DailyClosing[];
  defaultMenuItems: MenuItem[];
  expenses: Expense[];
  googleSheetSyncLogs: GoogleSheetSyncLog[];
  googleSheetSyncSettings: GoogleSheetSyncSettings;
  legacyImportBatches: LegacyImportBatch[];
  legacySales: LegacySale[];
  onAddGoogleSheetSyncLog: (log: GoogleSheetSyncLog) => void;
  onImportData: (data: AppStateData) => void;
  onResetData: () => void;
  onResetOperationalData: () => void;
  onSaveGoogleSheetSettings: (settings: GoogleSheetSyncSettings) => void;
  onSaveLegacyImport: (batch: LegacyImportBatch, sales: LegacySale[]) => void;
  transactions: CompletedTransaction[];
};

export function Settings({
  appData,
  businessSlug,
  currentUserName,
  currentUserId,
  currentUserRole,
  dailyClosings,
  defaultMenuItems,
  expenses,
  googleSheetSyncLogs,
  googleSheetSyncSettings,
  legacyImportBatches,
  legacySales,
  onAddGoogleSheetSyncLog,
  onImportData,
  onResetData,
  onResetOperationalData,
  onSaveGoogleSheetSettings,
  onSaveLegacyImport,
  transactions,
}: SettingsProps) {
  const [isLegacyImportOpen, setIsLegacyImportOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [adminToolMessage, setAdminToolMessage] = useState('');
  const [openSection, setOpenSection] = useState('staff');
  const settingsReport = buildSalesReport(
    transactions,
    'all',
    '',
    legacySales,
    expenses,
    dailyClosings,
  );
  const business = getBusinessBySlug(businessSlug);

  if (!business) {
    return null;
  }

  return (
    <section className="min-h-full rounded-2xl bg-white/80 backdrop-blur-sm p-4 shadow-elegant border border-santara-latte/40 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <div className="border-b border-santara-latte/50 pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-santara-gold">
          Pengaturan
        </p>
        <h2 className="mt-1 text-2xl font-black text-santara-roast tracking-tight">
          Pengaturan
        </h2>
        <p className="mt-1 text-sm text-santara-roast/60">
          Kelola akun tim, printer, sinkronisasi, dan data bisnis dari satu tempat.
        </p>
      </div>

      {adminToolMessage && (
        <p className="mt-4 rounded-xl border border-santara-latte/40 bg-santara-cream px-4 py-3 text-sm font-bold text-santara-bean">
          {adminToolMessage}
        </p>
      )}

      <div className="mx-auto mt-4 max-w-5xl space-y-3">
        <SettingsSection
          description="Tambah kasir, atur peran, nonaktifkan akses, atau ganti password."
          isOpen={openSection === 'staff'}
          onToggle={() => setOpenSection((current) => current === 'staff' ? '' : 'staff')}
          title="Akun & Staff"
        >
          <StaffManagement
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        </SettingsSection>

        <SettingsSection
          description="Hubungkan printer thermal Bluetooth dan atur ukuran kertas 58/80 mm."
          isOpen={openSection === 'printer'}
          onToggle={() => setOpenSection((current) => current === 'printer' ? '' : 'printer')}
          title="Printer"
        >
          <PrinterSettingsPanel business={business} />
        </SettingsSection>

        <SettingsSection
          description="Atur koneksi dan pengiriman rekap penjualan ke Google Sheet."
          isOpen={openSection === 'sync'}
          onToggle={() => setOpenSection((current) => current === 'sync' ? '' : 'sync')}
          title="Sinkronisasi"
        >
          <GoogleSheetSync
            currentUserName={currentUserName}
            hasReportData={settingsReport.totalTransactions > 0 || settingsReport.expenses.length > 0}
            logs={googleSheetSyncLogs}
            onAddLog={onAddGoogleSheetSyncLog}
            onSaveSettings={onSaveGoogleSheetSettings}
            report={settingsReport}
            reportMode="all"
            selectedDate=""
            settings={googleSheetSyncSettings}
          />
        </SettingsSection>

        <SettingsSection
          description="Ekspor cadangan, pulihkan data, atau masukkan riwayat dari POS lama."
          isOpen={openSection === 'data'}
          onToggle={() => setOpenSection((current) => current === 'data' ? '' : 'data')}
          title="Backup & Import"
        >
          <div className="space-y-3">
            <LocalDataPanel
              appData={appData}
              businessSlug={businessSlug}
              defaultMenuItems={defaultMenuItems}
              onImportData={onImportData}
              onResetData={onResetData}
            />
            <button
              className="w-full rounded-xl bg-santara-cream px-4 py-3 text-sm font-black text-santara-bean ring-1 ring-santara-latte transition hover:bg-santara-foam"
              onClick={() => setIsLegacyImportOpen(true)}
              type="button"
            >
              Import Data dari POS Lama
            </button>
          </div>
        </SettingsSection>

        <SettingsSection
          description="Tindakan berisiko untuk membersihkan data operasional testing."
          isOpen={openSection === 'danger'}
          onToggle={() => setOpenSection((current) => current === 'danger' ? '' : 'danger')}
          tone="danger"
          title="Zona Berbahaya"
        >
          <div className="rounded-xl border border-red-100 bg-red-50/65 p-3">
            <p className="text-sm font-bold leading-relaxed text-red-800/75">
              Gunakan hanya ketika ingin menghapus transaksi, pengeluaran, closing, dan data testing pada perangkat ini.
            </p>
            <button
              className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-red-700 ring-1 ring-red-200 transition hover:bg-red-50"
              onClick={() => {
                setResetConfirmText('');
                setIsResetModalOpen(true);
              }}
              type="button"
            >
              Reset Data Operasional Testing
            </button>
          </div>
        </SettingsSection>
      </div>

      {isLegacyImportOpen && (
        <SettingsModal onClose={() => setIsLegacyImportOpen(false)} title="Import Data Lama POS">
          <LegacyImport
            batches={legacyImportBatches}
            importedBy={currentUserName}
            onSaveImport={(batch, sales) => {
              onSaveLegacyImport(batch, sales);
              setAdminToolMessage('Data import lama berhasil disimpan.');
              setIsLegacyImportOpen(false);
            }}
          />
        </SettingsModal>
      )}

      {isResetModalOpen && (
        <OperationalResetModal
          confirmText={resetConfirmText}
          onCancel={() => {
            setIsResetModalOpen(false);
            setResetConfirmText('');
          }}
          onConfirm={() => {
            onResetOperationalData();
            setIsResetModalOpen(false);
            setResetConfirmText('');
            setAdminToolMessage('Data operasional testing berhasil direset.');
          }}
          onConfirmTextChange={setResetConfirmText}
        />
      )}
    </section>
  );
}

type SettingsSectionProps = {
  children: ReactNode;
  description: string;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  tone?: 'default' | 'danger';
};

function SettingsSection({
  children,
  description,
  isOpen,
  onToggle,
  title,
  tone = 'default',
}: SettingsSectionProps) {
  const sectionId = `settings-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section className={`overflow-hidden rounded-2xl border bg-white ${tone === 'danger' ? 'border-red-100' : 'border-santara-latte'}`}>
      <button
        aria-controls={sectionId}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-santara-cream/45"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0">
          <span className={`block text-base font-black ${tone === 'danger' ? 'text-red-700' : 'text-santara-roast'}`}>
            {title}
          </span>
          <span className="mt-0.5 block text-xs font-medium leading-relaxed text-santara-roast/55">
            {description}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`grid size-8 shrink-0 place-items-center rounded-full bg-santara-cream text-santara-bean transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <SettingsChevronIcon />
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-santara-latte/70 bg-santara-foam/35 p-3 sm:p-4" id={sectionId}>
          {children}
        </div>
      )}
    </section>
  );
}

function SettingsChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
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

type SettingsModalProps = {
  children: ReactNode;
  onClose: () => void;
  title: string;
};

function SettingsModal({ children, onClose, title }: SettingsModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-santara-roast/55 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-santara-foam p-3 shadow-soft ring-1 ring-santara-latte">
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-santara-clay">
              Pengaturan
            </p>
            <h2 className="mt-1 text-xl font-black text-santara-roast">
              {title}
            </h2>
          </div>
          <button
            className="rounded-lg bg-white px-3 py-2 text-xs font-black text-santara-clay ring-1 ring-santara-latte transition hover:bg-santara-cream"
            onClick={onClose}
            type="button"
          >
            Tutup
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

type OperationalResetModalProps = {
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
  onConfirmTextChange: (value: string) => void;
};

function OperationalResetModal({
  confirmText,
  onCancel,
  onConfirm,
  onConfirmTextChange,
}: OperationalResetModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-santara-roast/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-santara-foam p-5 shadow-soft ring-1 ring-santara-latte">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-santara-clay">
          Pengaturan
        </p>
        <h2 className="mt-1 text-2xl font-black text-santara-roast">
          Reset Data Operasional Testing
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-santara-roast/70">
          Ini hanya menghapus data operasional lokal/testing di browser ini. Menu
          dan kategori tidak akan dihapus.
        </p>
        <label className="mt-4 block">
          <span className="text-sm font-bold text-santara-roast/70">
            Ketik RESET untuk lanjut
          </span>
          <input
            className="mt-2 w-full rounded-lg bg-white px-3 py-3 text-sm font-black text-santara-roast outline-none ring-1 ring-santara-latte transition focus:ring-2 focus:ring-santara-clay"
            onChange={(event) => onConfirmTextChange(event.target.value)}
            value={confirmText}
          />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            className="rounded-lg bg-white px-4 py-3 text-sm font-black text-santara-clay ring-1 ring-santara-latte transition hover:bg-santara-cream"
            onClick={onCancel}
            type="button"
          >
            Batal
          </button>
          <button
            className="rounded-lg bg-santara-bean px-4 py-3 text-sm font-black text-white shadow-soft transition hover:bg-santara-roast disabled:cursor-not-allowed disabled:opacity-45"
            disabled={confirmText !== 'RESET'}
            onClick={onConfirm}
            type="button"
          >
            Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}
