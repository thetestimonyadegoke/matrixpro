import { computeSubtotal, AggregationType } from "../model/totals";

describe("Totals Computation", () => {
  describe("computeSubtotal with different aggregation types", () => {
    const sampleData = [100, 200, 300, 400, 500];

    it("should compute SUM correctly", () => {
      const result = computeSubtotal(sampleData, "sum");
      expect(result).toBe(1500);
    });

    it("should compute AVG correctly", () => {
      const result = computeSubtotal(sampleData, "avg");
      expect(result).toBe(300);
    });

    it("should compute MIN correctly", () => {
      const result = computeSubtotal(sampleData, "min");
      expect(result).toBe(100);
    });

    it("should compute MAX correctly", () => {
      const result = computeSubtotal(sampleData, "max");
      expect(result).toBe(500);
    });

    it("should compute COUNT correctly", () => {
      const result = computeSubtotal(sampleData, "count");
      expect(result).toBe(5);
    });
  });

  describe("computeSubtotal with null values", () => {
    const dataWithNulls: (number | null)[] = [100, null, 300, null, 500];

    it("should ignore nulls in SUM", () => {
      const result = computeSubtotal(dataWithNulls, "sum");
      expect(result).toBe(900);
    });

    it("should ignore nulls in AVG", () => {
      const result = computeSubtotal(dataWithNulls, "avg");
      expect(result).toBe(300);
    });

    it("should ignore nulls in MIN", () => {
      const result = computeSubtotal(dataWithNulls, "min");
      expect(result).toBe(100);
    });

    it("should ignore nulls in MAX", () => {
      const result = computeSubtotal(dataWithNulls, "max");
      expect(result).toBe(500);
    });

    it("should ignore nulls in COUNT", () => {
      const result = computeSubtotal(dataWithNulls, "count");
      expect(result).toBe(3);
    });
  });

  describe("computeSubtotal edge cases", () => {
    it("should return null for empty array", () => {
      const result = computeSubtotal([], "sum");
      expect(result).toBeNull();
    });

    it("should return null for all-null array", () => {
      const result = computeSubtotal([null, null, null], "sum");
      expect(result).toBeNull();
    });

    it("should handle single value", () => {
      expect(computeSubtotal([42], "sum")).toBe(42);
      expect(computeSubtotal([42], "avg")).toBe(42);
      expect(computeSubtotal([42], "min")).toBe(42);
      expect(computeSubtotal([42], "max")).toBe(42);
      expect(computeSubtotal([42], "count")).toBe(1);
    });

    it("should handle negative values", () => {
      const negatives = [-100, -200, -300];
      expect(computeSubtotal(negatives, "sum")).toBe(-600);
      expect(computeSubtotal(negatives, "avg")).toBe(-200);
      expect(computeSubtotal(negatives, "min")).toBe(-300);
      expect(computeSubtotal(negatives, "max")).toBe(-100);
    });

    it("should handle mixed positive and negative values", () => {
      const mixed = [-100, 0, 100];
      expect(computeSubtotal(mixed, "sum")).toBe(0);
      expect(computeSubtotal(mixed, "avg")).toBe(0);
      expect(computeSubtotal(mixed, "min")).toBe(-100);
      expect(computeSubtotal(mixed, "max")).toBe(100);
    });

    it("should handle decimal values", () => {
      const decimals = [1.5, 2.5, 3.0];
      expect(computeSubtotal(decimals, "sum")).toBe(7);
      expect(computeSubtotal(decimals, "avg")).toBeCloseTo(2.333, 2);
    });

    it("should handle very large numbers", () => {
      const large = [1e10, 2e10, 3e10];
      expect(computeSubtotal(large, "sum")).toBe(6e10);
    });

    it("should handle very small numbers", () => {
      const small = [1e-10, 2e-10, 3e-10];
      expect(computeSubtotal(small, "sum")).toBeCloseTo(6e-10, 20);
    });
  });
});
