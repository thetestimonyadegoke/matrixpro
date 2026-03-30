import { generateRowKey, generateColumnKey, generateCellKey, parseRowKey, parseColumnKey } from "../model/keys";
import { computeSubtotal, AggregationType } from "../model/totals";

describe("Key Generation", () => {
  describe("generateRowKey", () => {
    it("should generate a key for a simple path", () => {
      const key = generateRowKey(["Category A"]);
      expect(key).toBe("row:s:Category%20A");
    });

    it("should generate a key for a nested path", () => {
      const key = generateRowKey(["Category A", "Subcategory 1"]);
      expect(key).toBe("row:s:Category%20A|s:Subcategory%201");
    });

    it("should handle special characters in path", () => {
      const key = generateRowKey(["Category:A", "Sub|category"]);
      expect(key).toBe("row:s:Category%3AA|s:Sub%7Ccategory");
    });

    it("should handle numeric values in path", () => {
      const key = generateRowKey([2023, "Q1"]);
      expect(key).toBe("row:d:2023|s:Q1");
    });
  });

  describe("generateColumnKey", () => {
    it("should generate a key for a simple column path", () => {
      const key = generateColumnKey(["2023"]);
      expect(key).toBe("col:s:2023");
    });

    it("should generate a key for a nested column path", () => {
      const key = generateColumnKey(["2023", "Q1", "Jan"]);
      expect(key).toBe("col:s:2023|s:Q1|s:Jan");
    });
  });

  describe("generateCellKey", () => {
    it("should generate a unique cell key", () => {
      const rowKey = "row:s:Category%20A";
      const colKey = "col:s:2023";
      const measureIndex = 0;
      const cellKey = generateCellKey(rowKey, colKey, measureIndex);
      expect(cellKey).toBe("row:s:Category%20A::col:s:2023::m0");
    });

    it("should differentiate between measures", () => {
      const rowKey = "row:s:Category%20A";
      const colKey = "col:s:2023";
      const cellKey0 = generateCellKey(rowKey, colKey, 0);
      const cellKey1 = generateCellKey(rowKey, colKey, 1);
      expect(cellKey0).not.toBe(cellKey1);
    });
  });

  describe("parseRowKey", () => {
    it("should parse a simple row key", () => {
      const parts = parseRowKey("row:s:Category%20A");
      expect(parts).toEqual(["Category A"]);
    });

    it("should parse a nested row key", () => {
      const parts = parseRowKey("row:s:Category%20A|s:Subcategory%201");
      expect(parts).toEqual(["Category A", "Subcategory 1"]);
    });

    it("should return empty array for invalid key", () => {
      const parts = parseRowKey("invalid:key");
      expect(parts).toEqual([]);
    });
  });

  describe("parseColumnKey", () => {
    it("should parse a simple column key", () => {
      const parts = parseColumnKey("col:s:2023");
      expect(parts).toEqual(["2023"]);
    });

    it("should parse a nested column key", () => {
      const parts = parseColumnKey("col:s:2023|s:Q1|s:Jan");
      expect(parts).toEqual(["2023", "Q1", "Jan"]);
    });
  });
});

describe("Subtotal Computation", () => {
  describe("computeSubtotal", () => {
    const testValues = [10, 20, 30, 40, 50];
    const valuesWithNulls: (number | null)[] = [10, null, 30, null, 50];

    it("should compute sum correctly", () => {
      const result = computeSubtotal(testValues, "sum");
      expect(result).toBe(150);
    });

    it("should compute average correctly", () => {
      const result = computeSubtotal(testValues, "avg");
      expect(result).toBe(30);
    });

    it("should compute min correctly", () => {
      const result = computeSubtotal(testValues, "min");
      expect(result).toBe(10);
    });

    it("should compute max correctly", () => {
      const result = computeSubtotal(testValues, "max");
      expect(result).toBe(50);
    });

    it("should compute count correctly", () => {
      const result = computeSubtotal(testValues, "count");
      expect(result).toBe(5);
    });

    it("should handle null values in sum", () => {
      const result = computeSubtotal(valuesWithNulls, "sum");
      expect(result).toBe(90);
    });

    it("should handle null values in average", () => {
      const result = computeSubtotal(valuesWithNulls, "avg");
      expect(result).toBe(30);
    });

    it("should handle null values in count", () => {
      const result = computeSubtotal(valuesWithNulls, "count");
      expect(result).toBe(3);
    });

    it("should return null for empty array", () => {
      const result = computeSubtotal([], "sum");
      expect(result).toBeNull();
    });

    it("should return null for array with only nulls", () => {
      const result = computeSubtotal([null, null, null], "sum");
      expect(result).toBeNull();
    });

    it("should handle negative values", () => {
      const negativeValues = [-10, 20, -30, 40];
      expect(computeSubtotal(negativeValues, "sum")).toBe(20);
      expect(computeSubtotal(negativeValues, "min")).toBe(-30);
      expect(computeSubtotal(negativeValues, "max")).toBe(40);
    });

    it("should handle decimal values", () => {
      const decimalValues = [1.5, 2.5, 3.5];
      expect(computeSubtotal(decimalValues, "sum")).toBe(7.5);
      expect(computeSubtotal(decimalValues, "avg")).toBe(2.5);
    });
  });
});
