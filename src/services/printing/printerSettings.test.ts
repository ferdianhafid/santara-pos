import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadPrinterSettings,
  savePrinterSettings,
} from './printerSettings.ts';

function withLocalStorage(
  initialValue: string | null,
  run: (readStoredValue: () => string | null) => void,
) {
  let storedValue = initialValue;
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => storedValue,
        setItem: (_key: string, value: string) => {
          storedValue = value;
        },
      },
    },
  });

  try {
    run(() => storedValue);
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  }
}

test('saved printers from older app versions enable automatic reconnect', () => {
  withLocalStorage(
    JSON.stringify({
      deviceAddress: 'AA:BB:CC:DD:EE:FF',
      deviceName: 'RPP02N',
      paperWidth: '58mm',
      cutPaper: false,
    }),
    () => {
      const settings = loadPrinterSettings('santara');
      assert.equal(settings.autoConnect, true);
      assert.equal(settings.deviceAddress, 'AA:BB:CC:DD:EE:FF');
    },
  );
});

test('manual disconnect preference remains disabled after saving', () => {
  withLocalStorage(null, (readStoredValue) => {
    savePrinterSettings('santara', {
      deviceAddress: 'AA:BB:CC:DD:EE:FF',
      deviceName: 'RPP02N',
      paperWidth: '58mm',
      cutPaper: false,
      autoConnect: false,
    });

    assert.equal(loadPrinterSettings('santara').autoConnect, false);
    assert.equal(
      JSON.parse(readStoredValue() ?? '{}').autoConnect,
      false,
    );
  });
});
