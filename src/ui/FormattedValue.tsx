// Renders a formatted number so the digits carry the weight: currency symbols, unit suffixes
// (K, M, %) and sign/bracket marks are set quieter around them. The visible text is unchanged;
// only its parts are wrapped, so copy, search and export read exactly what was formatted.

import React from "react";

export type ValuePart = { text: string; kind: "sign" | "affix" | "digits" };

const SIGN_CHARS = "(-−+)";

function runs(text: string, classify: (ch: string) => "sign" | "affix"): ValuePart[] {
  const parts: ValuePart[] = [];
  for (const ch of text) {
    const kind = classify(ch);
    const last = parts[parts.length - 1];
    if (last && last.kind === kind) last.text += ch;
    else parts.push({ text: ch, kind });
  }
  return parts;
}

/** Splits "-$1,234.50M" into sign "-", affix "$", digits "1,234.50", affix "M". Non-numeric text is one part. */
export function splitFormattedValue(formatted: string): ValuePart[] {
  const first = formatted.search(/\d/);
  if (first < 0) return formatted ? [{ text: formatted, kind: "digits" }] : [];
  let last = formatted.length - 1;
  while (last > first && !/\d/.test(formatted[last])) last--;

  const prefix = formatted.slice(0, first);
  const core = formatted.slice(first, last + 1);
  const suffix = formatted.slice(last + 1);
  const classify = (ch: string): "sign" | "affix" => (SIGN_CHARS.includes(ch) ? "sign" : "affix");

  return [...runs(prefix, classify), { text: core, kind: "digits" as const }, ...runs(suffix, classify)];
}

const CURRENCY_SYMBOL = /[$€£¥₦₹₩₽₺₫₱₪₴₵₸₲₡¢฿₭₮₼₾]/;

/** How a currency symbol is drawn. "standard" is the quiet affix every value has always had. */
export type CurrencyStyle = "standard" | "subtle" | "raised" | "badge" | "edge" | "edgeBadge";

const CURRENCY_STYLES: ReadonlySet<string> = new Set(["standard", "subtle", "raised", "badge", "edge", "edgeBadge"]);

export function normalizeCurrencyStyle(value: unknown): CurrencyStyle {
  return typeof value === "string" && CURRENCY_STYLES.has(value) ? (value as CurrencyStyle) : "standard";
}

export const FormattedValue: React.FC<{ text: string; currencyStyle?: string }> = ({ text, currencyStyle }) => {
  const parts = splitFormattedValue(text);
  // Plain text (labels, dashes, N/A) needs no extra markup.
  if (parts.length <= 1) return <>{text}</>;

  const style = normalizeCurrencyStyle(currencyStyle);
  const currencyIndex = style === "standard"
    ? -1
    : parts.findIndex(part => part.kind === "affix" && CURRENCY_SYMBOL.test(part.text));

  const renderPart = (part: ValuePart, i: number): React.ReactNode =>
    part.kind === "digits"
      ? <span key={i} className="num-digits">{part.text}</span>
      : <span key={i} className={part.kind === "affix" ? "num-affix" : "num-sign"}>{part.text}</span>;

  if (currencyIndex < 0) return <>{parts.map(renderPart)}</>;

  const symbol = parts[currencyIndex].text.trim();
  const isBadge = style === "badge" || style === "edgeBadge";
  const currencyClass = `num-currency is-${isBadge ? "badge" : style === "raised" ? "raised" : "subtle"}`;

  if (style === "edge" || style === "edgeBadge") {
    return (
      <span className="num-edge">
        <span className={currencyClass} aria-hidden="true">{symbol}</span>
        <span className="num-edge-value">
          {parts.map((part, i) => (i === currencyIndex ? null : renderPart(part, i)))}
        </span>
      </span>
    );
  }

  return (
    <>
      {parts.map((part, i) =>
        i === currencyIndex
          ? <span key={i} className={currencyClass}>{isBadge ? symbol : part.text}</span>
          : renderPart(part, i)
      )}
    </>
  );
};
