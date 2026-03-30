export interface FormatOptions {
  format?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  useGrouping?: boolean;
}

export function formatNumber(value: number | null | undefined, options: FormatOptions = {}): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  const { format, decimals, prefix = "", suffix = "", useGrouping = true } = options;

  if (format) {
    return applyFormat(value, format);
  }

  const formattedNumber = formatWithDecimals(value, decimals, useGrouping);
  return `${prefix}${formattedNumber}${suffix}`;
}

function applyFormat(value: number, format: string): string {
  if (format.includes("%") || format.toLowerCase() === "percent") {
    const percentValue = value * 100;
    const decimals = getDecimalsFromFormat(format) ?? 1;
    return `${percentValue.toFixed(decimals)}%`;
  }

  if (format.includes("$") || format.toLowerCase().includes("currency")) {
    const decimals = getDecimalsFromFormat(format) ?? 2;
    return `$${formatWithDecimals(value, decimals, true)}`;
  }

  if (format.toLowerCase().includes("k")) {
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
  }

  if (format.toLowerCase().includes("m")) {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
  }

  const decimals = getDecimalsFromFormat(format);
  return formatWithDecimals(value, decimals, true);
}

function getDecimalsFromFormat(format: string): number | undefined {
  const match = format.match(/\.(\d+)/);
  if (match) {
    return match[1].length;
  }

  const zeroMatch = format.match(/0\.(0+)/);
  if (zeroMatch) {
    return zeroMatch[1].length;
  }

  return undefined;
}

function formatWithDecimals(value: number, decimals: number | undefined, useGrouping: boolean): string {
  if (decimals !== undefined) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping,
    });
  }

  if (Number.isInteger(value)) {
    return value.toLocaleString(undefined, { useGrouping });
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping,
  });
}

export function parseFormatString(format: string): FormatOptions {
  const options: FormatOptions = {};

  if (format.includes("%")) {
    options.suffix = "%";
  }

  if (format.includes("$")) {
    options.prefix = "$";
  }

  const decimals = getDecimalsFromFormat(format);
  if (decimals !== undefined) {
    options.decimals = decimals;
  }

  options.useGrouping = format.includes(",") || format.includes("#,##");

  return options;
}

export function abbreviateNumber(value: number, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1e12) {
    return `${sign}${(absValue / 1e12).toFixed(decimals)}T`;
  }
  if (absValue >= 1e9) {
    return `${sign}${(absValue / 1e9).toFixed(decimals)}B`;
  }
  if (absValue >= 1e6) {
    return `${sign}${(absValue / 1e6).toFixed(decimals)}M`;
  }
  if (absValue >= 1e3) {
    return `${sign}${(absValue / 1e3).toFixed(decimals)}K`;
  }

  return formatNumber(value, { decimals });
}

export function formatPercentage(value: number, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatCurrency(value: number, currency: string = "USD", decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  try {
    return value.toLocaleString(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch {
    return `$${formatWithDecimals(value, decimals, true)}`;
  }
}
