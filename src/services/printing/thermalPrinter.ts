import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BusinessIdentity } from '../../config/businesses';
import type { CompletedTransaction } from '../../types';
import type { PrinterSettings } from './printerSettings';
import { buildReceiptPrintBytes } from './receiptEncoder';
import { loadReceiptLogoRaster } from './receiptLogoRaster';

export type BluetoothPermissionState = 'granted' | 'prompt' | 'denied';

export type ThermalPrinterStatus = {
  supported: boolean;
  enabled: boolean;
  permission: BluetoothPermissionState;
  connected: boolean;
  connectedAddress?: string | null;
};

export type ThermalPrinterDevice = {
  name: string;
  address: string;
  type: 'classic' | 'dual' | 'le' | 'unknown';
  paired: boolean;
};

type ThermalPrinterPlugin = {
  getStatus(): Promise<ThermalPrinterStatus>;
  requestBluetoothPermission(): Promise<{
    permission: BluetoothPermissionState;
  }>;
  listPairedDevices(): Promise<{ devices: ThermalPrinterDevice[] }>;
  discoverDevices(): Promise<{
    devices: ThermalPrinterDevice[];
    completed: boolean;
  }>;
  pairDevice(options: {
    address: string;
  }): Promise<ThermalPrinterDevice>;
  connect(options: {
    address: string;
  }): Promise<ThermalPrinterDevice & { connected: boolean }>;
  disconnect(): Promise<{ connected: false }>;
  getConnectionStatus(): Promise<{
    connected: boolean;
    connectedAddress?: string | null;
  }>;
  print(options: {
    address: string;
    dataBase64: string;
  }): Promise<{ printed: boolean; bytesWritten: number }>;
};

const nativeThermalPrinter = registerPlugin<ThermalPrinterPlugin>('ThermalPrinter');
export const THERMAL_PRINTER_STATUS_EVENT = 'cafe-pos:thermal-printer-status';
let connectionQueue: Promise<void> = Promise.resolve();

export function canUseNativeThermalPrinter() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function getThermalPrinterStatus(): Promise<ThermalPrinterStatus> {
  if (!canUseNativeThermalPrinter()) {
    return {
      supported: false,
      enabled: false,
      permission: 'denied',
      connected: false,
      connectedAddress: null,
    };
  }
  return nativeThermalPrinter.getStatus();
}

export async function requestThermalPrinterPermission() {
  assertNativeAndroid();
  return nativeThermalPrinter.requestBluetoothPermission();
}

export async function listPairedThermalPrinters() {
  assertNativeAndroid();
  const result = await nativeThermalPrinter.listPairedDevices();
  return filterPrinterCandidates(result.devices);
}

export async function discoverThermalPrinters() {
  assertNativeAndroid();
  const result = await nativeThermalPrinter.discoverDevices();
  return filterPrinterCandidates(result.devices);
}

export async function pairThermalPrinter(address: string) {
  assertNativeAndroid();
  return nativeThermalPrinter.pairDevice({ address });
}

export async function connectThermalPrinter(address: string) {
  assertNativeAndroid();
  const result = await nativeThermalPrinter.connect({ address });
  notifyThermalPrinterStatusChanged();
  return result;
}

export async function disconnectThermalPrinter() {
  assertNativeAndroid();
  const result = await nativeThermalPrinter.disconnect();
  notifyThermalPrinterStatusChanged();
  return result;
}

export async function getThermalPrinterConnectionStatus() {
  assertNativeAndroid();
  return nativeThermalPrinter.getConnectionStatus();
}

export async function ensureThermalPrinterConnected(settings: PrinterSettings) {
  assertNativeAndroid();
  if (!settings.deviceAddress) {
    throw new Error('Pilih printer Bluetooth di Settings terlebih dahulu.');
  }

  const attempt = connectionQueue.then(async () => {
    const status = await getThermalPrinterStatus();
    if (!status.supported) {
      throw new Error('Perangkat Android ini tidak mendukung Bluetooth.');
    }
    if (status.permission !== 'granted') {
      throw new Error(
        'Izin Perangkat di Sekitar diperlukan. Buka Settings Printer untuk memberikannya.',
      );
    }
    if (!status.enabled) {
      throw new Error('Aktifkan Bluetooth Android, lalu coba cetak lagi.');
    }
    if (
      status.connected &&
      status.connectedAddress === settings.deviceAddress
    ) {
      return { connected: true, reconnected: false };
    }

    await connectThermalPrinter(settings.deviceAddress);
    return { connected: true, reconnected: true };
  });

  connectionQueue = attempt.then(
    () => undefined,
    () => undefined,
  );
  return attempt;
}

export async function printTransactionReceipt(
  transaction: CompletedTransaction,
  business: BusinessIdentity,
  settings: PrinterSettings,
  isReprint = false,
) {
  assertNativeAndroid();
  if (!settings.deviceAddress) {
    throw new Error('Pilih printer Bluetooth di Settings terlebih dahulu.');
  }

  await ensureThermalPrinterConnected(settings);

  const logoRaster =
    business.slug === 'santara'
      ? await loadReceiptLogoRaster(settings.paperWidth).catch(() => undefined)
      : undefined;
  const printBytes = buildReceiptPrintBytes(transaction, {
    businessName: business.name,
    cutPaper: settings.cutPaper,
    isReprint,
    paperWidth: settings.paperWidth,
    slogan:
      business.slug === 'santara'
        ? 'Ruang untuk cerita, jeda untuk jiwa'
        : undefined,
    wifiName: business.slug === 'santara' ? 'Santara' : undefined,
    wifiPassword:
      business.slug === 'santara' ? 'chillwithsantara' : undefined,
    logoRaster,
    thankYouMessage: `Terima kasih sudah mampir ke ${
      business.slug === 'santara' ? 'Santara' : 'Parama'
    }`,
  });

  return nativeThermalPrinter.print({
    address: settings.deviceAddress,
    dataBase64: bytesToBase64(printBytes),
  });
}

export async function printThermalTestPage(
  business: BusinessIdentity,
  settings: PrinterSettings,
) {
  assertNativeAndroid();
  if (!settings.deviceAddress) {
    throw new Error('Pilih printer Bluetooth terlebih dahulu.');
  }

  await ensureThermalPrinterConnected(settings);

  const width = settings.paperWidth === '58mm' ? 32 : 48;
  const text = [
    business.name.toUpperCase(),
    'TES PRINTER BERHASIL',
    '-'.repeat(width),
    `Ukuran kertas: ${settings.paperWidth}`,
    `Printer: ${settings.deviceName || settings.deviceAddress}`,
    new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date()),
    '-'.repeat(width),
    'Cafe POS',
    '',
    '',
    '',
  ].join('\n');
  const textBytes = new TextEncoder().encode(text);
  const suffix = settings.cutPaper
    ? new Uint8Array([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00])
    : new Uint8Array([0x0a, 0x0a, 0x0a]);
  const bytes = new Uint8Array(textBytes.length + suffix.length + 2);
  bytes.set([0x1b, 0x40], 0);
  bytes.set(textBytes, 2);
  bytes.set(suffix, textBytes.length + 2);
  return nativeThermalPrinter.print({
    address: settings.deviceAddress,
    dataBase64: bytesToBase64(bytes),
  });
}

function assertNativeAndroid() {
  if (!canUseNativeThermalPrinter()) {
    throw new Error('Direct thermal print hanya tersedia di aplikasi Android.');
  }
}

function notifyThermalPrinterStatusChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(THERMAL_PRINTER_STATUS_EVENT));
  }
}

function filterPrinterCandidates(devices: ThermalPrinterDevice[]) {
  return devices.filter((device) => device.type !== 'le');
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}
