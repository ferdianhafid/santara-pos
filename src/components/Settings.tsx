import { useState, type ReactNode } from 'react';
import { GoogleSheetSync } from './GoogleSheetSync';
import { LegacyImport } from './LegacyImport';
import { LocalDataPanel } from './LocalDataPanel';
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
  currentUserName: string;
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
  currentUserName,
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
  const settingsReport = buildSalesReport(
    transactions,
    'all',
    '',
    legacySales,
    expenses,
    dailyClosings,
  );

  return (
    <section className="min-h-full rounded-2xl bg-white/80 backdrop-blur-sm p-4 shadow-elegant border border-santara-latte/40 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <div className="border-b border-santara-latte/50 pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-santara-gold">
          Settings
        </p>
        <h2 className="mt-1 text-2xl font-black text-santara-roast tracking-tight">
          Settings
        </h2>
        <p className="mt-1 text-sm text-santara-roast/60">
          Pengaturan data lokal, Google Sheet, dan alat admin.
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <LocalDataPanel
            appData={appData}
            defaultMenuItems={defaultMenuItems}
            onImportData={onImportData}
            onResetData={onResetData}
          />

          <section className="rounded-lg bg-white p-3 ring-1 ring-santara-latte">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-santara-clay">
                Admin Tools
              </p>
              <h3 className="mt-1 text-lg font-black text-santara-roast">
                Data Operasional
              </h3>
              <p className="mt-1 text-sm text-santara-roast/60">
                Import data lama dan reset data testing dipusatkan di sini.
              </p>
            </div>

            {adminToolMessage && (
              <p className="mt-3 rounded-xl bg-santara-cream px-4 py-3 text-sm font-bold text-santara-bean border border-santara-latte/40">
                {adminToolMessage}
              </p>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                className="rounded-lg bg-santara-cream px-3 py-3 text-xs font-black text-santara-bean ring-1 ring-santara-latte transition hover:bg-santara-foam"
                onClick={() => setIsLegacyImportOpen(true)}
                type="button"
              >
                Import Data Lama POS
              </button>
              <button
                className="rounded-lg bg-white px-3 py-3 text-xs font-black text-santara-clay ring-1 ring-santara-latte transition hover:bg-santara-cream"
                onClick={() => {
                  setResetConfirmText('');
                  setIsResetModalOpen(true);
                }}
                type="button"
              >
                Reset Data Operasional Testing
              </button>
            </div>
          </section>
        </div>

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
              Settings
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
          Settings
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
