import type { ThermalPaperWidth } from './receiptEncoder';

const LOGO_SRC = '/assets/santara-logo-transparent.png';
const paperDots: Record<ThermalPaperWidth, number> = {
  '58mm': 384,
  '80mm': 576,
};
const logoDots: Record<ThermalPaperWidth, number> = {
  '58mm': 260,
  '80mm': 390,
};
const logoCache = new Map<ThermalPaperWidth, Promise<Uint8Array>>();

export function loadReceiptLogoRaster(paperWidth: ThermalPaperWidth) {
  const cached = logoCache.get(paperWidth);
  if (cached) {
    return cached;
  }

  const request = createReceiptLogoRaster(paperWidth);
  logoCache.set(paperWidth, request);
  return request;
}

async function createReceiptLogoRaster(paperWidth: ThermalPaperWidth) {
  const image = await loadImage(LOGO_SRC);
  const printerWidth = paperDots[paperWidth];
  const logoWidth = logoDots[paperWidth];
  const logoHeight = Math.max(
    Math.round((image.naturalHeight / image.naturalWidth) * logoWidth),
    1,
  );
  const canvas = document.createElement('canvas');
  canvas.width = printerWidth;
  canvas.height = logoHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas logo printer tidak tersedia.');
  }

  const left = Math.floor((printerWidth - logoWidth) / 2);
  context.clearRect(0, 0, printerWidth, logoHeight);
  context.drawImage(image, left, 0, logoWidth, logoHeight);
  const pixels = context.getImageData(0, 0, printerWidth, logoHeight).data;
  const widthBytes = Math.ceil(printerWidth / 8);
  const raster = new Uint8Array(widthBytes * logoHeight);

  for (let y = 0; y < logoHeight; y += 1) {
    for (let x = 0; x < printerWidth; x += 1) {
      const alpha = pixels[(y * printerWidth + x) * 4 + 3];
      if (alpha >= 96) {
        raster[y * widthBytes + Math.floor(x / 8)] |= 0x80 >> (x % 8);
      }
    }
  }

  const command = new Uint8Array(8 + raster.length + 1);
  command.set([
    0x1d,
    0x76,
    0x30,
    0x00,
    widthBytes & 0xff,
    (widthBytes >> 8) & 0xff,
    logoHeight & 0xff,
    (logoHeight >> 8) & 0xff,
  ]);
  command.set(raster, 8);
  command[command.length - 1] = 0x0a;
  return command;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Logo struk tidak dapat dimuat.'));
    image.src = source;
  });
}
