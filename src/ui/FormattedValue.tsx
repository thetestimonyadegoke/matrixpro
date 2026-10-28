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

export const FormattedValue: React.FC<{ text: string }> = ({ text }) => {
  const parts = splitFormattedValue(text);
  // Plain text (labels, dashes, N/A) needs no extra markup.
  if (parts.length <= 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        part.kind === "digits"
          ? <span key={i} className="num-digits">{part.text}</span>
          : <span key={i} className={part.kind === "affix" ? "num-affix" : "num-sign"}>{part.text}</span>
      )}
    </>
  );
};
