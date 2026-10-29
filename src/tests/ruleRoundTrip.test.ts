/**
 * A conditional formatting rule that is saved and reloaded must come back exactly as it was edited.
 * The panel saves with stringifyRules and reads with parseRules, so this is the whole persistence path.
 */
import { ConditionalRule, normalizeRule, parseRules, stringifyRules } from "../format/conditional";

const baseRule = (): ConditionalRule => ({
  id: "rule_edit",
  title: "Edited",
  enabled: true,
  scope: { targetType: "rows", targetMeasure: -1, rowHierarchyLevels: "valuesAndTotals", excludeColumnGrandTotal: false },
  formatBy: "rules",
});

function saveAndReload(rule: ConditionalRule): ConditionalRule {
  const saved = stringifyRules([normalizeRule(rule)]);
  return parseRules({ enabled: true, rules: saved } as any)[0];
}

const edited = (patch: Partial<ConditionalRule>): ConditionalRule =>
  normalizeRule({ ...baseRule(), ...patch });

describe("an edited rule survives save and reload", () => {
  it("keeps every style field of an if-conditions rule", () => {
    const rule = edited({
      title: "Overdue",
      enabled: false,
      scope: { targetType: "columns", targetMeasure: 1, targetMeasures: [1, 2], rowHierarchyLevels: "totalsOnly", excludeColumnGrandTotal: true },
      formatBy: "rules",
      rulesConfig: {
        impactOn: ["label", "chart"],
        conditions: [
          { basedOnMeasure: 1, op: "between", value: 5, value2: 90 },
          { basedOnMeasure: -1, op: "notEquals", value: -3.5 },
        ],
        style: {
          color: "#112233",
          backgroundColor: "#ffeecc",
          fontWeight: "700",
          fontStyle: "italic",
          textDecoration: "underline",
          hatched: true,
          hideText: true,
          iconPosition: "rightOfData",
          borderColor: "#445566",
          borderStyle: "dashed",
          borderWidth: 3,
        },
      },
    });
    expect(saveAndReload(rule)).toEqual(rule);
  });

  it("keeps a colour scale's edits", () => {
    const rule = edited({
      formatBy: "colorScale",
      colorScaleConfig: {
        basedOnMeasure: 1,
        applyTo: "both",
        heatMapType: "tableWise",
        scaleType: "diverging",
        colorScheme: ["#111111", "#808080", "#eeeeee"],
        reverse: true,
        numberOfBands: 7,
        hideValue: true,
        autoFontColor: false,
        includeNull: true,
      },
    });
    expect(saveAndReload(rule)).toEqual(rule);
  });

  it("keeps data bar edits", () => {
    const rule = edited({
      formatBy: "dataBars",
      dataBarsConfig: { basedOnMeasure: 1, positiveColor: "#00aa00", negativeColor: "#aa0000", axisPosition: "middle", showBarOnly: true, barDirection: "rightToLeft" },
    });
    expect(saveAndReload(rule)).toEqual(rule);
  });

  it("keeps ranking edits", () => {
    const rule = edited({
      formatBy: "ranking",
      rankingConfig: {
        basedOnMeasure: 1,
        topCount: 3,
        mode: "both",
        usePercentage: true,
        style: { color: "#abcdef", fontWeight: "700", iconPosition: "leftOfData", borderStyle: "none", borderWidth: 1 },
        impactOn: ["chart"],
      },
    });
    expect(saveAndReload(rule)).toEqual(rule);
  });

  it("keeps a classification rule's edited ranges, including the open-ended ones", () => {
    const rule = edited({
      formatBy: "classification",
      classificationConfig: {
        impactOn: ["label"],
        basedOnMeasure: 1,
        displayIcons: true,
        showValueText: false,
        iconSet: "target-status",
        applyToCharts: false,
        showAsNewColumn: true,
        iconPosition: "rightOfData",
        rangeMode: "value",
        ranges: [
          { from: -Infinity, to: 5, iconKind: "cross", color: "#aa0000" },
          { from: 5, to: 50, iconKind: "warn", color: "#ccaa00" },
          { from: 50, to: 200, iconKind: "check", color: "#00aa00" },
          { from: 200, to: Infinity, iconKind: "up", color: "#0000aa" },
        ],
      },
    });
    const back = saveAndReload(rule);
    expect(back.classificationConfig!.ranges.map(r => [r.from, r.to])).toEqual([
      [-Infinity, 5],
      [5, 50],
      [50, 200],
      [200, Infinity],
    ]);
    expect(back).toEqual(rule);
  });

  it("keeps a classification rule's ranges when there are fewer or more than the default three", () => {
    for (const count of [2, 5]) {
      const ranges = Array.from({ length: count }, (_, i) => ({
        from: i === 0 ? -Infinity : i * 10,
        to: i === count - 1 ? Infinity : (i + 1) * 10,
        iconKind: "check" as const,
        color: "#00aa00",
      }));
      const rule = edited({ formatBy: "classification", classificationConfig: { ...normalizeRule({ ...baseRule(), formatBy: "classification" }).classificationConfig!, ranges } as any });
      const back = saveAndReload(rule);
      expect(back.classificationConfig!.ranges.map(r => [r.from, r.to])).toEqual(ranges.map(r => [r.from, r.to]));
    }
  });
});

describe("rules saved by earlier versions", () => {
  it("reads null range bounds as the open ends", () => {
    // JSON.stringify used to write Infinity as null.
    const legacy: any = {
      ...baseRule(),
      formatBy: "classification",
      classificationConfig: {
        impactOn: ["label"],
        basedOnMeasure: -1,
        displayIcons: true,
        applyToCharts: true,
        showAsNewColumn: false,
        iconPosition: "leftOfData",
        rangeMode: "value",
        ranges: [
          { from: null, to: 20, iconKind: "cross", color: "#aa0000" },
          { from: 20, to: null, iconKind: "check", color: "#00aa00" },
        ],
      },
    };
    const [rule] = parseRules({ enabled: true, rules: JSON.stringify([legacy]) } as any);
    expect(rule.classificationConfig!.ranges.map(r => [r.from, r.to])).toEqual([
      [-Infinity, 20],
      [20, Infinity],
    ]);
  });
});
