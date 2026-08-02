import type { BusinessSlug } from '../../config/businesses';
import type { ThermalPaperWidth } from './receiptEncoder';

export type PrinterSettings = {
  deviceAddress: string;
  deviceName: string;
  paperWidth: ThermalPaperWidth;
  cutPaper: boolean;
  autoConnect: boolean;
};

const defaultSettings: PrinterSettings = {
  deviceAddress: '',
  deviceName: '',
  paperWidth: '58mm',
  cutPaper: true,
  autoConnect: false,
};

export function loadPrinterSettings(businessSlug: BusinessSlug): PrinterSettings {
  if (typeof window === 'undefined') {
    return { ...defaultSettings };
  }

  try {
    const stored = window.localStorage.getItem(getPrinterSettingsKey(businessSlug));
    if (!stored) {
      return { ...defaultSettings };
    }

    const value = JSON.parse(stored) as Partial<PrinterSettings>;
    const deviceAddress =
      typeof value.deviceAddress === 'string' ? value.deviceAddress : '';
    return {
      deviceAddress,
      deviceName: typeof value.deviceName === 'string' ? value.deviceName : '',
      paperWidth: value.paperWidth === '80mm' ? '80mm' : '58mm',
      cutPaper: value.cutPaper !== false,
      autoConnect:
        typeof value.autoConnect === 'boolean'
          ? value.autoConnect
          : Boolean(deviceAddress),
    };
  } catch {
    return { ...defaultSettings };
  }
}

export function savePrinterSettings(
  businessSlug: BusinessSlug,
  settings: PrinterSettings,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    getPrinterSettingsKey(businessSlug),
    JSON.stringify(settings),
  );
}

export function getDefaultPrinterSettings() {
  return { ...defaultSettings };
}

function getPrinterSettingsKey(businessSlug: BusinessSlug) {
  return `cafe-pos:printer:v1:${businessSlug}`;
}
