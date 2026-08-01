import { useEffect, useState } from 'react';
import type { BusinessIdentity } from '../config/businesses';
import {
  getDefaultPrinterSettings,
  loadPrinterSettings,
  savePrinterSettings,
  type PrinterSettings,
} from '../services/printing/printerSettings';
import {
  canUseNativeThermalPrinter,
  getThermalPrinterStatus,
  listPairedThermalPrinters,
  printThermalTestPage,
  requestThermalPrinterPermission,
  type PairedPrinterDevice,
  type ThermalPrinterStatus,
} from '../services/printing/thermalPrinter';

type PrinterSettingsProps = {
  business: BusinessIdentity;
};

const initialStatus: ThermalPrinterStatus = {
  supported: false,
  enabled: false,
  permission: 'denied',
};

export function PrinterSettingsPanel({ business }: PrinterSettingsProps) {
  const nativeAndroid = canUseNativeThermalPrinter();
  const [settings, setSettings] = useState<PrinterSettings>(() =>
    loadPrinterSettings(business.slug),
  );
  const [status, setStatus] = useState<ThermalPrinterStatus>(initialStatus);
  const [devices, setDevices] = useState<PairedPrinterDevice[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setSettings(loadPrinterSettings(business.slug));
    setDevices([]);
    setMessage('');
  }, [business.slug]);

  useEffect(() => {
    if (!nativeAndroid) {
      setStatus(initialStatus);
      return;
    }

    void getThermalPrinterStatus()
      .then(setStatus)
      .catch(() => setStatus(initialStatus));
  }, [nativeAndroid]);

  const updateSettings = (updates: Partial<PrinterSettings>) => {
    setSettings((current) => ({ ...current, ...updates }));
    setMessage('');
  };

  const loadPrinters = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      let nextStatus = await getThermalPrinterStatus();
      if (nextStatus.permission !== 'granted') {
        await requestThermalPrinterPermission();
        nextStatus = await getThermalPrinterStatus();
      }
      setStatus(nextStatus);

      if (!nextStatus.enabled) {
        throw new Error('Aktifkan Bluetooth Android, lalu coba lagi.');
      }

      const pairedDevices = await listPairedThermalPrinters();
      setDevices(pairedDevices);
      setMessage(
        pairedDevices.length > 0
          ? `${pairedDevices.length} perangkat Bluetooth Classic ditemukan.`
          : 'Belum ada printer Bluetooth yang dipasangkan di Android.',
      );
    } catch (error) {
      setMessage(getErrorMessage(error, 'Gagal membaca printer Bluetooth.'));
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = () => {
    savePrinterSettings(business.slug, settings);
    setMessage('Pengaturan printer tersimpan di perangkat ini.');
  };

  const testPrint = async () => {
    setIsTesting(true);
    setMessage('');
    try {
      savePrinterSettings(business.slug, settings);
      await printThermalTestPage(business, settings);
      setMessage('Tes print berhasil dikirim ke printer.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Tes print gagal.'));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <section className="rounded-lg bg-white p-3 ring-1 ring-santara-latte">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-santara-clay">
            Printer
          </p>
          <h3 className="mt-1 text-lg font-black text-santara-roast">
            Thermal 58/80 mm
          </h3>
          <p className="mt-1 text-sm text-santara-roast/60">
            Bluetooth ESC/POS disimpan per bisnis dan per perangkat kasir.
          </p>
        </div>
        <span className="rounded-full bg-santara-cream px-3 py-1 text-xs font-black text-santara-bean ring-1 ring-santara-latte">
          {nativeAndroid ? 'Android' : 'Web Print'}
        </span>
      </div>

      {!nativeAndroid ? (
        <div className="mt-4 rounded-xl border border-santara-latte/50 bg-santara-cream/70 p-4 text-sm font-semibold text-santara-roast/70">
          Direct Bluetooth hanya aktif di aplikasi Android. Website tetap memakai
          dialog Print browser seperti sebelumnya.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <PrinterStatus label="Bluetooth" value={status.enabled ? 'Aktif' : 'Belum aktif'} />
            <PrinterStatus
              label="Izin"
              value={status.permission === 'granted' ? 'Diberikan' : 'Diperlukan'}
            />
            <PrinterStatus
              label="Printer"
              value={settings.deviceName || 'Belum dipilih'}
            />
          </div>

          <button
            className="btn-secondary w-full px-4 py-3 text-sm"
            disabled={isLoading}
            onClick={loadPrinters}
            type="button"
          >
            {isLoading ? 'Membaca perangkat...' : 'Izinkan & Muat Printer Terpasang'}
          </button>

          <label className="block text-sm font-black text-santara-roast">
            Printer Bluetooth
            <select
              className="input-premium mt-2 w-full"
              onChange={(event) => {
                const device = devices.find(
                  (item) => item.address === event.target.value,
                );
                updateSettings({
                  deviceAddress: device?.address ?? '',
                  deviceName: device?.name ?? '',
                });
              }}
              value={settings.deviceAddress}
            >
              <option value="">Pilih printer terpasang</option>
              {devices.map((device) => (
                <option key={device.address} value={device.address}>
                  {device.name} ({device.address})
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-sm font-black text-santara-roast">Ukuran kertas</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['58mm', '80mm'] as const).map((paperWidth) => (
                <button
                  className={
                    settings.paperWidth === paperWidth
                      ? 'btn-primary px-4 py-3 text-sm'
                      : 'btn-secondary px-4 py-3 text-sm'
                  }
                  key={paperWidth}
                  onClick={() => updateSettings({ paperWidth })}
                  type="button"
                >
                  {paperWidth === '58mm' ? '58 mm (32 kolom)' : '80 mm (48 kolom)'}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-santara-latte/50 bg-santara-cream/60 px-4 py-3 text-sm font-bold text-santara-roast">
            <input
              checked={settings.cutPaper}
              onChange={(event) => updateSettings({ cutPaper: event.target.checked })}
              type="checkbox"
            />
            Kirim perintah potong kertas jika printer memiliki auto-cutter
          </label>

          {message && (
            <p className="rounded-xl bg-santara-cream px-4 py-3 text-sm font-bold text-santara-bean ring-1 ring-santara-latte">
              {message}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className="btn-secondary px-4 py-3 text-sm"
              onClick={saveSettings}
              type="button"
            >
              Simpan Pengaturan
            </button>
            <button
              className="btn-primary px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!settings.deviceAddress || isTesting}
              onClick={testPrint}
              type="button"
            >
              {isTesting ? 'Mengirim...' : 'Tes Print'}
            </button>
          </div>

          <button
            className="text-xs font-black text-santara-clay underline underline-offset-4"
            onClick={() => {
              const defaults = getDefaultPrinterSettings();
              setSettings(defaults);
              savePrinterSettings(business.slug, defaults);
              setMessage('Pengaturan printer direset.');
            }}
            type="button"
          >
            Reset pengaturan printer
          </button>
        </div>
      )}
    </section>
  );
}

function PrinterStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-santara-cream/70 px-3 py-3 ring-1 ring-santara-latte/60">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-santara-sage">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-santara-roast">{value}</p>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
