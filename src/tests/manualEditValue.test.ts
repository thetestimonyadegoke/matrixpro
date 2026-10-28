import { parseManualEditNumber } from "../utils/manualEditValue";

describe("parseManualEditNumber", () => {
  it("parses plain numbers", () => {
    expect(parseManualEditNumber("42")).toBe(42);
    expect(parseManualEditNumber(" -3.5 ")).toBe(-3.5);
    expect(parseManualEditNumber(".25")).toBe(0.25);
    expect(parseManualEditNumber("1e3")).toBe(1000);
  });

  it("accepts correctly grouped thousands separators", () => {
    expect(parseManualEditNumber("1,000")).toBe(1000);
    expect(parseManualEditNumber("-12,345.67")).toBe(-12345.67);
    expect(parseManualEditNumber("1,00")).toBeNull();
    expect(parseManualEditNumber("10,00,000")).toBeNull();
  });

  it("treats anything with non-numeric content as text", () => {
    expect(parseManualEditNumber("12 units")).toBeNull();
    expect(parseManualEditNumber("pending review")).toBeNull();
    expect(parseManualEditNumber("15%")).toBeNull();
    expect(parseManualEditNumber("")).toBeNull();
    expect(parseManualEditNumber("   ")).toBeNull();
    expect(parseManualEditNumber("Infinity")).toBeNull();
  });
});
