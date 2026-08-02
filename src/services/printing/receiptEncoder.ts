import type { CompletedTransaction } from '../../types';
import { getSizedMenuName } from '../../utils/menuVariants.ts';

export type ThermalPaperWidth = '58mm' | '80mm';

export type ReceiptEncodingOptions = {
  businessName: string;
  paperWidth: ThermalPaperWidth;
  isReprint?: boolean;
  slogan?: string;
  wifiName?: string;
  wifiPassword?: string;
  cutPaper?: boolean;
  logoRaster?: Uint8Array;
  thankYouMessage?: string;
};

const paperColumns: Record<ThermalPaperWidth, number> = {
  '58mm': 32,
  '80mm': 48,
};

const ESC = 0x1b;
const GS = 0x1d;

export function buildReceiptText(
  transaction: CompletedTransaction,
  options: ReceiptEncodingOptions,
) {
  const width = paperColumns[options.paperWidth];
  const divider = '-'.repeat(width);
  const strongDivider = '='.repeat(width);
  const date = new Date(transaction.dateTime);
  const itemDiscount = transaction.itemDiscountAmount ?? 0;
  const transactionDiscount =
    transaction.transactionDiscountAmount ??
    Math.max(transaction.discountAmount - itemDiscount, 0);
  const lines: string[] = [];

  lines.push(center(options.businessName.toUpperCase(), width));
  if (options.slogan) {
    lines.push(...wrapText(options.slogan, width).map((line) => center(line, width)));
  }
  if (options.isReprint) {
    lines.push(center('*** CETAK ULANG ***', width));
  }
  if (transaction.status === 'voided') {
    lines.push(center('*** STRUK DIBATALKAN ***', width));
  }
  lines.push(divider);
  lines.push(labelValue('No. Struk', transaction.receiptNumber, width));
  lines.push(labelValue('Tanggal', formatReceiptDate(date), width));
  lines.push(labelValue('Waktu', formatReceiptTime(date), width));
  lines.push(labelValue('Kasir', transaction.cashierName, width));
  lines.push(labelValue('Pembayaran', transaction.paymentMethod, width));

  if (transaction.status === 'voided') {
    lines.push(divider);
    lines.push(...wrapText(`Alasan: ${transaction.voidReason ?? '-'}`, width));
    lines.push(...wrapText(`Oleh: ${transaction.voidedBy ?? '-'}`, width));
    if (transaction.voidedAt) {
      const voidedDate = new Date(transaction.voidedAt);
      lines.push(
        ...wrapText(
          `Waktu: ${formatReceiptDate(voidedDate)}, ${formatReceiptTime(voidedDate)}`,
          width,
        ),
      );
    }
  }

  lines.push(divider);
  lines.push(threeColumns('ITEM QTY', 'HARGA', 'TOTAL', width));
  lines.push(divider);
  transaction.items.forEach((item, index) => {
    const itemLabelLines = wrapText(
      `${getSizedMenuName(item.nameSnapshot, item.sizeSnapshot)} x${item.quantity}`,
      getThreeColumnLeftWidth(width),
    );
    lines.push(
      threeColumns(
        itemLabelLines[0],
        formatMoney(item.unitPriceSnapshot),
        formatMoney(item.grossLineTotal ?? item.subtotal),
        width,
      ),
    );
    itemLabelLines.slice(1).forEach((line) => {
      lines.push(threeColumns(line, '', '', width));
    });
    if (item.notes?.trim()) {
      lines.push(
        ...wrapText(`> ${item.notes.trim()}`, width - 2).map((line) => `  ${line}`),
      );
    }
    if ((item.itemDiscountAmount ?? 0) > 0) {
      lines.push(
        columns(
          'Diskon item',
          `-${formatMoney(item.itemDiscountAmount ?? 0)}`,
          width,
        ),
      );
    }
    if (index < transaction.items.length - 1) {
      lines.push(divider);
    }
  });

  lines.push(divider);
  lines.push(
    columns('Subtotal', formatMoney(transaction.subtotalBeforeDiscount), width),
  );
  if (itemDiscount > 0) {
    lines.push(columns('Diskon item', `-${formatMoney(itemDiscount)}`, width));
  }
  if (transactionDiscount > 0) {
    lines.push(
      columns(
        'Diskon transaksi',
        `-${formatMoney(transactionDiscount)}`,
        width,
      ),
    );
  }
  if (transaction.discountAmount > 0) {
    lines.push(
      columns(
        'Total diskon',
        `-${formatMoney(transaction.discountAmount)}`,
        width,
      ),
    );
  }
  lines.push(strongDivider);
  lines.push(columns('TOTAL', formatMoney(transaction.totalAfterDiscount), width));

  if (transaction.paymentMethod === 'Cash') {
    lines.push(divider);
    lines.push(columns('Bayar', formatMoney(transaction.paidAmount ?? 0), width));
    lines.push(divider);
    lines.push(
      columns('Kembalian', formatMoney(transaction.changeAmount ?? 0), width),
    );
  }

  if (options.wifiName || options.wifiPassword) {
    lines.push(divider);
    if (options.wifiName) {
      lines.push(center(`WiFi ${options.wifiName}`, width));
    }
    if (options.wifiPassword) {
      lines.push(center(`Password: ${options.wifiPassword}`, width));
    }
  }

  lines.push(divider);
  lines.push(
    ...wrapText(options.thankYouMessage ?? 'Terima kasih', width).map((line) =>
      center(line, width),
    ),
  );
  lines.push(center('Sampai jumpa lagi', width));
  lines.push(center('. . . . .', width));

  return `${lines.map(toPrinterAscii).join('\n')}\n`;
}

export function buildReceiptPrintBytes(
  transaction: CompletedTransaction,
  options: ReceiptEncodingOptions,
) {
  const textBytes = new TextEncoder().encode(buildReceiptText(transaction, options));
  const prefix = new Uint8Array([
    ESC,
    0x40, // Initialize printer.
    ESC,
    0x74,
    0x00, // Select the common CP437-compatible code page.
  ]);
  const suffix = options.cutPaper === false
    ? new Uint8Array([0x0a, 0x0a, 0x0a])
    : new Uint8Array([
        0x0a,
        0x0a,
        0x0a,
        GS,
        0x56,
        0x42,
        0x00, // Feed and partial cut; ignored by printers without a cutter.
      ]);
  const logoRaster = options.logoRaster ?? new Uint8Array();
  const result = new Uint8Array(
    prefix.length + logoRaster.length + textBytes.length + suffix.length,
  );
  result.set(prefix, 0);
  result.set(logoRaster, prefix.length);
  result.set(textBytes, prefix.length + logoRaster.length);
  result.set(suffix, prefix.length + logoRaster.length + textBytes.length);
  return result;
}

export function getPaperColumns(paperWidth: ThermalPaperWidth) {
  return paperColumns[paperWidth];
}

function columns(left: string, right: string, width: number) {
  const safeLeft = toPrinterAscii(left);
  const safeRight = toPrinterAscii(right);
  const availableLeft = Math.max(width - safeRight.length - 1, 1);
  const trimmedLeft = safeLeft.slice(0, availableLeft);
  const gap = Math.max(width - trimmedLeft.length - safeRight.length, 1);
  return `${trimmedLeft}${' '.repeat(gap)}${safeRight}`;
}

function threeColumns(
  left: string,
  middle: string,
  right: string,
  width: number,
) {
  const safeLeft = toPrinterAscii(left);
  const safeMiddle = toPrinterAscii(middle);
  const safeRight = toPrinterAscii(right);
  const rightWidth = getThreeColumnRightWidth(width);
  const leftWidth = getThreeColumnLeftWidth(width);
  return `${safeLeft.slice(0, leftWidth).padEnd(leftWidth)}${safeMiddle
    .slice(0, rightWidth)
    .padStart(rightWidth)}${safeRight.slice(0, rightWidth).padStart(rightWidth)}`;
}

function getThreeColumnRightWidth(width: number) {
  return width === paperColumns['58mm'] ? 9 : 14;
}

function getThreeColumnLeftWidth(width: number) {
  return width - getThreeColumnRightWidth(width) * 2;
}

function labelValue(label: string, value: string, width: number) {
  const prefix = `${label}: `;
  const available = Math.max(width - prefix.length, 1);
  const wrappedValue = wrapText(value, available);
  return wrappedValue
    .map((line, index) => `${index === 0 ? prefix : ' '.repeat(prefix.length)}${line}`)
    .join('\n');
}

function center(value: string, width: number) {
  const safeValue = toPrinterAscii(value).slice(0, width);
  return `${' '.repeat(Math.max(Math.floor((width - safeValue.length) / 2), 0))}${safeValue}`;
}

function wrapText(value: string, width: number) {
  const words = toPrinterAscii(value).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [''];
  }

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let index = 0; index < word.length; index += width) {
        lines.push(word.slice(index, index + width));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= width) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }
  return lines;
}

function toPrinterAscii(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e]/g, '?');
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(Math.max(Math.round(value), 0));
}

function formatReceiptDate(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatReceiptTime(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
