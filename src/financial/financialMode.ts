/**
 * Financial Reporting Mode
 * Enables special formatting and behaviors for financial statements
 */

export interface FinancialModeSettings {
  enabled: boolean;
  negativeFormat: "minus" | "parentheses";
  displayUnits: "full" | "thousands" | "millions";
  decimalPlaces: number;
  showVarianceColumns: boolean;
  showPercentChange: boolean;
  signConvention: "normal" | "expense-negative";
}

export const defaultFinancialModeSettings: FinancialModeSettings = {
  enabled: false,
  negativeFormat: "parentheses",
  displayUnits: "full",
  decimalPlaces: 0,
  showVarianceColumns: false,
  showPercentChange: false,
  signConvention: "normal",
};

/**
 * Format a number according to financial mode settings
 */
export function formatFinancialValue(
  value: number | null,
  settings: FinancialModeSettings,
  currencySymbol: string = "$"
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  let displayValue = value;

  // Apply display units
  let suffix = "";
  switch (settings.displayUnits) {
    case "thousands":
      displayValue = value / 1000;
      suffix = "K";
      break;
    case "millions":
      displayValue = value / 1000000;
      suffix = "M";
      break;
  }

  // Apply sign convention
  if (settings.signConvention === "expense-negative") {
    // Expenses shown as negative (already handled by data usually)
  }

  const isNegative = displayValue < 0;
  const absValue = Math.abs(displayValue);

  // Format with decimal places
  const formatted = absValue.toLocaleString(undefined, {
    minimumFractionDigits: settings.decimalPlaces,
    maximumFractionDigits: settings.decimalPlaces,
  });

  // Apply negative format
  if (isNegative) {
    if (settings.negativeFormat === "parentheses") {
      return `(${currencySymbol}${formatted}${suffix})`;
    } else {
      return `-${currencySymbol}${formatted}${suffix}`;
    }
  }

  return `${currencySymbol}${formatted}${suffix}`;
}

/**
 * Calculate variance between two values
 */
export function calculateVariance(
  actual: number | null,
  budget: number | null
): number | null {
  if (actual === null || budget === null) return null;
  return actual - budget;
}

/**
 * Calculate percent change between two values
 */
export function calculatePercentChange(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Period intelligence helpers
 */
export type PeriodType = "month" | "quarter" | "year" | "custom";

export interface PeriodInfo {
  type: PeriodType;
  label: string;
  startDate?: Date;
  endDate?: Date;
  index: number;
}

/**
 * Detect period type from column labels
 */
export function detectPeriodType(columnLabels: string[]): PeriodType {
  if (columnLabels.length === 0) return "custom";

  const monthPatterns = [
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    /^\d{4}-\d{2}$/,
    /^(january|february|march|april|may|june|july|august|september|october|november|december)/i,
  ];

  const quarterPatterns = [
    /^q[1-4]/i,
    /^(q1|q2|q3|q4)\s*\d{4}/i,
  ];

  const yearPatterns = [
    /^\d{4}$/,
    /^fy\s*\d{4}/i,
  ];

  let monthCount = 0;
  let quarterCount = 0;
  let yearCount = 0;

  for (const label of columnLabels) {
    if (monthPatterns.some(p => p.test(label))) monthCount++;
    if (quarterPatterns.some(p => p.test(label))) quarterCount++;
    if (yearPatterns.some(p => p.test(label))) yearCount++;
  }

  const total = columnLabels.length;
  if (monthCount / total > 0.5) return "month";
  if (quarterCount / total > 0.5) return "quarter";
  if (yearCount / total > 0.5) return "year";

  return "custom";
}

/**
 * Calculate YTD (Year-to-Date) values
 */
export function calculateYTD(
  values: (number | null)[],
  currentIndex: number
): number | null {
  let sum = 0;
  let hasValue = false;

  for (let i = 0; i <= currentIndex; i++) {
    if (values[i] !== null) {
      sum += values[i]!;
      hasValue = true;
    }
  }

  return hasValue ? sum : null;
}

/**
 * Calculate rolling average
 */
export function calculateRollingAverage(
  values: (number | null)[],
  currentIndex: number,
  periods: number
): number | null {
  const startIndex = Math.max(0, currentIndex - periods + 1);
  let sum = 0;
  let count = 0;

  for (let i = startIndex; i <= currentIndex; i++) {
    if (values[i] !== null) {
      sum += values[i]!;
      count++;
    }
  }

  return count > 0 ? sum / count : null;
}

/**
 * Calculate running total
 */
export function calculateRunningTotal(
  values: (number | null)[],
  currentIndex: number
): number | null {
  let sum = 0;
  let hasValue = false;

  for (let i = 0; i <= currentIndex; i++) {
    if (values[i] !== null) {
      sum += values[i]!;
      hasValue = true;
    }
  }

  return hasValue ? sum : null;
}

/**
 * Financial statement section types
 */
export type StatementSectionType = 
  | "revenue"
  | "cogs"
  | "gross-profit"
  | "operating-expense"
  | "operating-income"
  | "other-income"
  | "other-expense"
  | "ebitda"
  | "depreciation"
  | "ebit"
  | "interest"
  | "tax"
  | "net-income"
  | "custom";

export interface StatementSection {
  type: StatementSectionType;
  label: string;
  rowKeys: string[];
  isCalculated: boolean;
  formula?: string;
  style: {
    bold: boolean;
    underline: "none" | "single" | "double";
    indent: number;
  };
}

/**
 * P&L statement template
 */
export const pnlStatementTemplate: StatementSection[] = [
  {
    type: "revenue",
    label: "Revenue",
    rowKeys: [],
    isCalculated: false,
    style: { bold: true, underline: "none", indent: 0 },
  },
  {
    type: "cogs",
    label: "Cost of Goods Sold",
    rowKeys: [],
    isCalculated: false,
    style: { bold: false, underline: "none", indent: 1 },
  },
  {
    type: "gross-profit",
    label: "Gross Profit",
    rowKeys: [],
    isCalculated: true,
    formula: "Revenue - COGS",
    style: { bold: true, underline: "single", indent: 0 },
  },
  {
    type: "operating-expense",
    label: "Operating Expenses",
    rowKeys: [],
    isCalculated: false,
    style: { bold: false, underline: "none", indent: 1 },
  },
  {
    type: "operating-income",
    label: "Operating Income",
    rowKeys: [],
    isCalculated: true,
    formula: "Gross Profit - Operating Expenses",
    style: { bold: true, underline: "single", indent: 0 },
  },
  {
    type: "other-income",
    label: "Other Income",
    rowKeys: [],
    isCalculated: false,
    style: { bold: false, underline: "none", indent: 1 },
  },
  {
    type: "other-expense",
    label: "Other Expenses",
    rowKeys: [],
    isCalculated: false,
    style: { bold: false, underline: "none", indent: 1 },
  },
  {
    type: "tax",
    label: "Income Tax",
    rowKeys: [],
    isCalculated: false,
    style: { bold: false, underline: "none", indent: 1 },
  },
  {
    type: "net-income",
    label: "Net Income",
    rowKeys: [],
    isCalculated: true,
    formula: "Operating Income + Other Income - Other Expenses - Tax",
    style: { bold: true, underline: "double", indent: 0 },
  },
];
