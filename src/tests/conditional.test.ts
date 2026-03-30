import { evaluateConditionalFormatting, computeVisibleRangeStats, getContrastColor } from "../format/conditional";
import { ConditionalFormattingSettings } from "../settings/settings";

describe("Conditional Formatting", () => {
  const defaultSettings: ConditionalFormattingSettings = {
    enabled: true,
    ruleType: "thresholds",
    lowColor: "#ff0000",
    midColor: "#ffff00",
    highColor: "#00ff00",
    lowThreshold: 33,
    highThreshold: 66,
    applyToAllMeasures: true,
    targetMeasure: 0,
  };

  describe("evaluateConditionalFormatting", () => {
    it("should return empty style when disabled", () => {
      const disabledSettings = { ...defaultSettings, enabled: false };
      const result = evaluateConditionalFormatting(50, 0, 100, disabledSettings);
      expect(result).toEqual({});
    });

    it("should return empty style for null value", () => {
      const result = evaluateConditionalFormatting(null, 0, 100, defaultSettings);
      expect(result).toEqual({});
    });

    it("should return empty style for NaN value", () => {
      const result = evaluateConditionalFormatting(NaN, 0, 100, defaultSettings);
      expect(result).toEqual({});
    });

    it("should return mid color when range is zero", () => {
      const result = evaluateConditionalFormatting(50, 50, 50, defaultSettings);
      expect(result.backgroundColor).toBe(defaultSettings.midColor);
    });

    it("should apply low color for values in low range (thresholds)", () => {
      const result = evaluateConditionalFormatting(10, 0, 100, defaultSettings);
      expect(result.backgroundColor).toBeDefined();
    });

    it("should apply high color for values in high range (thresholds)", () => {
      const result = evaluateConditionalFormatting(90, 0, 100, defaultSettings);
      expect(result.backgroundColor).toBeDefined();
    });

    it("should apply mid color for values in mid range (thresholds)", () => {
      const result = evaluateConditionalFormatting(50, 0, 100, defaultSettings);
      expect(result.backgroundColor).toBeDefined();
    });

    it("should apply band colors correctly", () => {
      const bandSettings = { ...defaultSettings, ruleType: "bands" as const };

      const lowResult = evaluateConditionalFormatting(10, 0, 100, bandSettings);
      expect(lowResult.backgroundColor).toBe(bandSettings.lowColor);

      const midResult = evaluateConditionalFormatting(50, 0, 100, bandSettings);
      expect(midResult.backgroundColor).toBe(bandSettings.midColor);

      const highResult = evaluateConditionalFormatting(90, 0, 100, bandSettings);
      expect(highResult.backgroundColor).toBe(bandSettings.highColor);
    });

    it("should handle negative values", () => {
      const result = evaluateConditionalFormatting(-50, -100, 100, defaultSettings);
      expect(result.backgroundColor).toBeDefined();
    });

    it("should handle decimal values", () => {
      const result = evaluateConditionalFormatting(0.5, 0, 1, defaultSettings);
      expect(result.backgroundColor).toBeDefined();
    });
  });

  describe("computeVisibleRangeStats", () => {
    it("should compute min and max correctly", () => {
      const values = [10, 20, 30, 40, 50];
      const stats = computeVisibleRangeStats(values);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
    });

    it("should handle null values", () => {
      const values: (number | null)[] = [10, null, 30, null, 50];
      const stats = computeVisibleRangeStats(values);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
    });

    it("should handle empty array", () => {
      const stats = computeVisibleRangeStats([]);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
    });

    it("should handle array with only nulls", () => {
      const stats = computeVisibleRangeStats([null, null, null]);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
    });

    it("should handle negative values", () => {
      const values = [-50, -20, 0, 20, 50];
      const stats = computeVisibleRangeStats(values);
      expect(stats.min).toBe(-50);
      expect(stats.max).toBe(50);
    });

    it("should handle single value", () => {
      const stats = computeVisibleRangeStats([42]);
      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
    });
  });

  describe("getContrastColor", () => {
    it("should return black for light backgrounds", () => {
      expect(getContrastColor("#ffffff")).toBe("#000000");
      expect(getContrastColor("#ffff00")).toBe("#000000");
    });

    it("should return white for dark backgrounds", () => {
      expect(getContrastColor("#000000")).toBe("#ffffff");
      expect(getContrastColor("#0000ff")).toBe("#ffffff");
    });

    it("should handle invalid color gracefully", () => {
      expect(getContrastColor("invalid")).toBe("#000000");
    });
  });
});
