import { formatValue, formatCurrency } from "../model/pivot";
import { applyRowQuickFormat } from "../format/cellDisplay";

describe("formatValue currency formats", () => {
  it("renders $ formats exactly as before", () => {
    expect(formatValue(1234.5, "\\$#,0.00;(\\$#,0.00)")).toBe("$1,234.50");
    expect(formatValue(1234.5, "$#,##0.00")).toBe("$1,234.50");
    expect(formatValue(0, "\\$#,0.00;(\\$#,0.00)")).toBe("$0.00");
    expect(formatValue(1234.5, "currency")).toBe("$1,234.50");
  });

  it("uses a bare or escaped € / £ prefix", () => {
    expect(formatValue(1234567.891, "€#,0.00")).toBe("€1,234,567.89");
    expect(formatValue(1234.5, "\\£#,0.00")).toBe("£1,234.50");
  });

  it("reads the symbol from a [$sym-lcid] locale tag", () => {
    expect(formatValue(1234.5, "[$₦-466]#,0.00")).toBe("₦1,234.50");
    expect(formatValue(1234.5, "[$€-2] #,0.00")).toBe("€ 1,234.50");
  });

  it("keeps a suffix currency after the number", () => {
    expect(formatValue(1234.5, "#,0.00 €")).toBe("1,234.50 €");
    expect(formatValue(-1234.5, "#,0.00 €")).toBe("-1,234.50 €");
  });

  it("uses the parenthesised negative section", () => {
    expect(formatValue(-1234, "\\$#,0.00;(\\$#,0.00)")).toBe("($1,234.00)");
    expect(formatValue(-1234, "€#,0.00;(€#,0.00)")).toBe("(€1,234.00)");
    expect(formatValue(-1234, "\\£#,0.00;\\£-#,0.00")).toBe("£-1,234.00");
  });

  it("puts the minus before the symbol without a negative section", () => {
    expect(formatValue(-1234, "\\£#,0.00")).toBe("-£1,234.00");
  });

  it("follows the format's decimals and grouping", () => {
    expect(formatValue(1234.567, "€#,0")).toBe("€1,235");
    expect(formatValue(1234.5, "€0.000")).toBe("€1234.500");
    expect(formatValue(1234.5, "€#,0.0#")).toBe("€1,234.5");
    expect(formatValue(1234567, "€#,0,")).toBe("€1,235");
  });

  it("does not treat locale-only tags or non-currency formats as currency", () => {
    expect(formatCurrency(1, "[$-409]#,0.00")).toBeNull();
    expect(formatCurrency(1, "#,0.00")).toBeNull();
    expect(formatValue(1234.5, "#,0.00")).toBe("1234.50");
  });

  it("applies a decimals override", () => {
    expect(formatCurrency(1234.5, "€#,0.00", 0)).toBe("€1,235");
  });
});

describe("applyRowQuickFormat currency", () => {
  it("takes the symbol from the format string", () => {
    expect(applyRowQuickFormat(1234.5, "currency", 2, "#,0.00 €")).toBe("1,234.50 €");
    expect(applyRowQuickFormat(-1234.5, "currency", 2, "[$₦-466]#,0.00;([$₦-466]#,0.00)")).toBe("(₦1,234.50)");
  });

  it("falls back to USD without a currency format", () => {
    // Locale-dependent ("$1,234.50" in en-US, "US$1,234.50" elsewhere), as before.
    const usd = new Intl.NumberFormat(undefined, {
      style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(1234.5);
    expect(applyRowQuickFormat(1234.5, "currency", 2)).toBe(usd);
    expect(applyRowQuickFormat(1234.5, "currency", 2, "#,0.00")).toBe(usd);
  });
});
