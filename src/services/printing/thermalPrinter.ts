import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BusinessIdentity } from '../../config/businesses';
import type { CompletedTransaction } from '../../types';
import type { PrinterSettings } from './printerSettings';
import { buildReceiptPrintBytes } from './receiptEncoder';

export type BluetoothPermissionState = 'granted' | 'prompt' | 'denied';

export type ThermalPrinterStatus = {
  supported: boolean;
  enabled: boolean;
  permission: BluetoothPermissionState;
};

export type PairedPrinterDevice = {
  name: string;
  address: string;
  type: 'classic' | 'dual' | 'le' | 'unknown';
};

type ThermalPrinterPlugin = {
  getStatus(): Promise<ThermalPrinterStatus>;
  requestBluetoothPermission(): Promise<{
    permission: BluetoothPermissionState;
  }>;
  listPairedDevices(): Promise<{ devices: PairedPrinterDevice[] }>;
  print(options: {
    address: string;
    dataBase64: string;
  }): Promise<{ printed: boolean; bytesWritten: number }>;
};

const nativeThermalPrinter = registerPlugin<ThermalPrinterPlugin>('ThermalPrinter');

export function canUseNativeThermalPrinter() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function getThermalPrinterStatus(): Promise<ThermalPrinterStatus> {
  if (!canUseNativeThermalPrinter()) {
    return {
      supported: false,
      enabled: false,
      permission: 'denied',
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
  return result.devices.filter(
    (device) => device.type === 'classic' || device.type === 'dual',
  );
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

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}
