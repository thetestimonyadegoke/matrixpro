import { FlattenedNode } from "./tree";
import { MeasureInfo } from "./pivot";
import { VisualSettings } from "../settings/settings";
import {
  LevelAwareFieldConfig,
  LevelAwareRowFieldConfig,
  columnMatchesLevelAwareField,
  findFieldConfig,
  getLevelAwareConfig,
  isDetailField,
  isDistributedField,
  measureFieldId,
  orderedLevelAwareFields,
  orderedRowDetailFields,
} from "./levelAwareColumns";

export type GridColumn = {
  key: string;
  col: FlattenedNode;
  measure: MeasureInfo;
  measureIndex: number;
  synthetic?: "ytd" | "detail" | "rowDetail";
  sourceColumnKeys?: string[];
  levelAwareField?: LevelAwareFieldConfig;
  detailSourceColumnKeys?: string[];
  rowDetailLevelIndex?: number;
  rowDetailField?: LevelAwareRowFieldConfig;
};

export type VisualColumnFrequency = "all" | "yearly" | "quarterly" | "specific" | "ytd";
export type VisualColumnPosition = "normal" | "beginning" | "end" | "specific";
/** Where YTD columns go: beside each period, or collected as one block at either end of the matrix. */
export type YtdPlacement = "perPeriod" | "start" | "end";
export type VisualColumnDefinition = {
  id: string;
  enabled?: boolean;
  sourceMeasureId?: string;
  sourceMeasureName?: string;
  sourceMeasureIndex?: number;
  frequency?: VisualColumnFrequency;
  position?: VisualColumnPosition;
  ytdPlacement?: YtdPlacement;
  positionIndex?: number;
  specificColumnKeys?: string[];
  hierarchyLevel?: number;
};

export type LevelAwareConfig = ReturnType<typeof getLevelAwareConfig>;

export function parseVisualColumnRules(json: string | undefined): VisualColumnDefinition[] {
  try {
    const parsed = JSON.parse(json || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((rule: VisualColumnDefinition) => rule && rule.enabled !== false)
      : [];
  } catch {
    return [] as VisualColumnDefinition[];
  }
}

/**
 * The grid's column plan: which data columns are shown, in what order, with
 * which measure, including synthetic YTD and level-aware detail columns. Shared
 * by the on-screen grid and every export so they always match.
 */
export function buildGridColumns(
  columns: FlattenedNode[],
  measures: MeasureInfo[],
  settings: VisualSettings,
  visualColumnRules: VisualColumnDefinition[] = parseVisualColumnRules(settings.calculations.visualColumns),
  levelAwareConfig: LevelAwareConfig = getLevelAwareConfig(settings)
): GridColumn[] {
  if (columns.length === 0 || measures.length === 0) return [];

  // Filter columns to only include those that should have a corresponding data cell in the grid.
  // These are truly leaf columns OR nodes that are collapsed (acting as leaves) OR subtotal nodes.
  const hiddenSet = new Set(
    (() => { try { return JSON.parse(settings.manualData.hiddenCols || "[]") as string[]; } catch { return []; } })()
  );
  const hiddenColumnPaths = columns
    .filter(col => hiddenSet.has(col.key))
    .map(col => (col.path || []).map(value => String(value ?? "")))
    .filter(path => path.length > 0);
  const isHiddenColumn = (col: FlattenedNode) => {
    if (hiddenSet.has(col.key)) return true;
    const colPath = (col.path || []).map(value => String(value ?? ""));
    return hiddenColumnPaths.some(hiddenPath =>
      hiddenPath.length <= colPath.length &&
      hiddenPath.every((part, index) => colPath[index] === part)
    );
  };
  const isHiddenMeasureAtColumn = (col: FlattenedNode, measure: MeasureInfo, measureIndex: number) => {
    const keys = new Set<string>([
      `m_${measureIndex}`,
      `m:${measureIndex}`,
      `${col.key}::m${measureIndex}`,
    ]);
    if (measure.index !== undefined && measure.index !== measureIndex) {
      keys.add(`m_${measure.index}`);
      keys.add(`m:${measure.index}`);
      keys.add(`${col.key}::m${measure.index}`);
    }
    return [...keys].some(key => hiddenSet.has(key));
  };

  const visualLeafs: FlattenedNode[] = [];
  const seenKeys = new Set<string>(); // Track keys to prevent duplicates

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const nextCol = columns[i + 1];
    const isLast = i === columns.length - 1;
    if (isHiddenColumn(col)) continue;

    // It's a leaf for rendering purposes if:
    // 1. It's a true leaf node (isLeaf=true)
    // 2. It's a subtotal node (always acts as a leaf in the grid columns)
    // 3. The next node in the flattened list is not a child of this node (meaning this node is collapsed)
    if (col.isLeaf || col.isSubtotal || isLast || nextCol.level <= col.level) {
      // Skip if we've already seen this key (prevents duplicates)
      if (seenKeys.has(col.key)) {
        continue;
      }
      seenKeys.add(col.key);
      visualLeafs.push(col);
    }
  }

  const firstLeafKey = visualLeafs[0]?.key;
  const lastLeafKey = visualLeafs[visualLeafs.length - 1]?.key;
  const yearKey = (col: FlattenedNode) => String(col.path?.[0] ?? col.label ?? "");
  const quarterKey = (col: FlattenedNode) => {
    const label = col.path?.map(String).join(" ") || col.label;
    const explicit = label.match(/q([1-4])/i);
    if (explicit) return `${yearKey(col)}::Q${explicit[1]}`;
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = monthNames.findIndex(monthName => String(col.path?.[col.path.length - 1] ?? col.label).toLowerCase().startsWith(monthName));
    return `${yearKey(col)}::Q${month >= 0 ? Math.floor(month / 3) + 1 : 1}`;
  };
  const isYearEnd = (col: FlattenedNode, index: number) => {
    if (col.isSubtotal || col.isGrandTotal) return true;
    const next = visualLeafs[index + 1];
    return !next || yearKey(next) !== yearKey(col);
  };
  const isQuarterEnd = (col: FlattenedNode, index: number) => {
    if (col.isSubtotal || col.isGrandTotal) return true;
    const next = visualLeafs[index + 1];
    return !next || quarterKey(next) !== quarterKey(col);
  };
  const ruleForMeasure = (measure: MeasureInfo, measureIndex: number) => {
    return visualColumnRules.find(rule => {
      if (measure.id) {
        return !!rule.sourceMeasureId && rule.sourceMeasureId === measure.id;
      }
      if (rule.sourceMeasureId) return false;
      if (rule.sourceMeasureName && rule.sourceMeasureName.toLowerCase() === measure.name.toLowerCase()) return true;
      if (!rule.sourceMeasureId && !rule.sourceMeasureName && rule.sourceMeasureIndex === measureIndex) return true;
      return false;
    });
  };
  const shouldShowMeasureAtColumn = (
    measure: MeasureInfo,
    measureIndex: number,
    col: FlattenedNode,
    colIndex: number
  ) => {
    const rule = ruleForMeasure(measure, measureIndex);
    if (!rule) return true;
    if (rule.frequency === "ytd") return true;
    if (rule.hierarchyLevel !== undefined && col.level !== rule.hierarchyLevel) return false;
    if (rule.position === "beginning" && col.key !== firstLeafKey) return false;
    if (rule.position === "end" && col.key !== lastLeafKey) return false;
    if (rule.position === "specific" && rule.positionIndex !== undefined && colIndex !== rule.positionIndex) return false;

    switch (rule.frequency || "all") {
      case "yearly":
        return isYearEnd(col, colIndex);
      case "quarterly":
        return isQuarterEnd(col, colIndex);
      case "specific":
        return !!rule.specificColumnKeys?.includes(col.key);
      case "all":
      default:
        return true;
    }
  };

  const measureOrderKeys = (() => {
    try { return JSON.parse(settings.manualData.colOrder || "[]") as string[]; } catch { return []; }
  })();
  const measureOrder = measureOrderKeys
    .map(key => {
      if (key.startsWith("m_")) return parseInt(key.slice(2), 10);
      if (key.startsWith("m:")) return parseInt(key.slice(2), 10);
      return NaN;
    })
    .filter(index => Number.isFinite(index));
  const orderedMeasureIndexes = [
    ...measureOrder.filter((index, position, arr) => index >= 0 && index < measures.length && arr.indexOf(index) === position),
    ...measures.map((_, index) => index).filter(index => !measureOrder.includes(index)),
  ];
  const ytdSourceKeysForColumn = (col: FlattenedNode, colIndex: number) => {
    const currentYear = yearKey(col);
    return visualLeafs
      .slice(0, colIndex + 1)
      .filter(sourceCol => !sourceCol.isSubtotal && !sourceCol.isGrandTotal && yearKey(sourceCol) === currentYear)
      .map(sourceCol => sourceCol.key);
  };
  const makeYtdGridColumn = (col: FlattenedNode, colIndex: number, measureIndex: number): GridColumn => {
    const ytdColKey = `${col.key}::__ytd__m${measureIndex}`;
    const ytdPath = [...(col.path || []), "YTD"];
    const ytdCol: FlattenedNode = {
      ...col,
      key: ytdColKey,
      label: "YTD",
      path: ytdPath,
      isSubtotal: true,
      isGrandTotal: false,
      isLeaf: true,
      hasChildren: false,
    };
    return {
      key: `${ytdColKey}::m${measureIndex}`,
      col: ytdCol,
      measure: measures[measureIndex],
      measureIndex,
      synthetic: "ytd",
      sourceColumnKeys: ytdSourceKeysForColumn(col, colIndex),
    };
  };

  const detailFields = levelAwareConfig.enabled
    ? orderedLevelAwareFields(levelAwareConfig, measures)
        .filter(item => isDetailField(item.field))
    : [];
  const detailMeasureIndexes = new Set(detailFields.map(item => item.measureIndex));
  const rowDetailFields = orderedRowDetailFields(levelAwareConfig);
  const rowDetailColumns: GridColumn[] = rowDetailFields.map((field, order) => {
    const detailCol: FlattenedNode = {
      key: `__rowdetail__${field.levelIndex}`,
      label: field.fieldName || `Row level ${field.levelIndex + 1}`,
      value: field.fieldName || `Row level ${field.levelIndex + 1}`,
      path: ["Row Details"],
      children: [],
      isExpanded: true,
      level: 0,
      isLeaf: true,
      isSubtotal: false,
      isGrandTotal: false,
      hasChildren: false,
      indent: 0,
      visibleIndex: order,
    };
    return {
      key: `${detailCol.key}::rowlevel${field.levelIndex}`,
      col: detailCol,
      measure: {
        ...(measures[0] || { index: 0, format: "", queryName: "" }),
        index: measures[0]?.index ?? 0,
        name: field.fieldName || `Row level ${field.levelIndex + 1}`,
        format: "",
        queryName: `__rowdetail__${field.levelIndex}`,
      },
      measureIndex: 0,
      synthetic: "rowDetail",
      rowDetailLevelIndex: field.levelIndex,
      rowDetailField: field,
    };
  });
  const detailColumns: GridColumn[] = detailFields.map((item, order) => {
    const detailCol: FlattenedNode = {
      key: `__detail__${measureFieldId(item.measure, item.measureIndex)}`,
      label: item.measure.name,
      value: item.measure.name,
      path: ["Row Details"],
      children: [],
      isExpanded: true,
      level: 0,
      isLeaf: true,
      isSubtotal: false,
      isGrandTotal: false,
      hasChildren: false,
      indent: 0,
      visibleIndex: order,
    };
    return {
      key: `${detailCol.key}::m${item.measureIndex}`,
      col: detailCol,
      measure: item.measure,
      measureIndex: item.measureIndex,
      synthetic: "detail",
      levelAwareField: item.field,
      detailSourceColumnKeys: visualLeafs.map(col => col.key),
    };
  });

  let baseResult: GridColumn[] = [];
  const groupedYtdStart: GridColumn[] = [];
  const groupedYtdEnd: GridColumn[] = [];
  for (let colIndex = 0; colIndex < visualLeafs.length; colIndex++) {
    const col = visualLeafs[colIndex];
    for (const m of orderedMeasureIndexes) {
      const levelAwareField = levelAwareConfig.enabled ? findFieldConfig(levelAwareConfig, measures[m], m) : undefined;
      if (levelAwareConfig.enabled && detailMeasureIndexes.has(m)) continue;
      if (levelAwareConfig.enabled && !isDistributedField(levelAwareField)) continue;
      if (levelAwareConfig.enabled && !columnMatchesLevelAwareField(col, levelAwareField)) continue;
      if (isHiddenMeasureAtColumn(col, measures[m], m)) continue;
      if (!shouldShowMeasureAtColumn(measures[m], m, col, colIndex)) continue;
      const rule = ruleForMeasure(measures[m], m);
      const shouldInsertYtd = rule?.frequency === "ytd" && !col.isSubtotal && !col.isGrandTotal;
      const ytdGroup = shouldInsertYtd && rule.ytdPlacement === "start" ? groupedYtdStart
        : shouldInsertYtd && rule.ytdPlacement === "end" ? groupedYtdEnd
        : null;
      if (shouldInsertYtd && ytdGroup) {
        ytdGroup.push(makeYtdGridColumn(col, colIndex, m));
      }
      if (shouldInsertYtd && !ytdGroup && rule.position === "beginning") {
        baseResult.push(makeYtdGridColumn(col, colIndex, m));
      }
      baseResult.push({
        key: `${col.key}::m${m}`,
        col,
        measure: measures[m],
        measureIndex: m,
        levelAwareField,
      });
      if (shouldInsertYtd && !ytdGroup && rule.position !== "beginning") {
        baseResult.push(makeYtdGridColumn(col, colIndex, m));
      }
    }
  }

  const standaloneColumns = [...rowDetailColumns, ...detailColumns];
  if (standaloneColumns.length > 0) {
    const before = standaloneColumns.filter(col => {
      const placement = col.levelAwareField?.placement || "beforeDistributed";
      return col.synthetic === "rowDetail" || placement === "afterRowHeaders" || placement === "beforeDistributed" || placement === "frozenWithRowHeaders";
    });
    const after = standaloneColumns.filter(col => {
      const placement = col.levelAwareField?.placement || "beforeDistributed";
      return col.synthetic !== "rowDetail" && (placement === "afterDistributed" || placement === "end");
    });
    baseResult = [...before, ...baseResult, ...after];
  }

  let colOrder: string[] = [];
  try { colOrder = JSON.parse(settings.manualData.colOrder || "[]"); } catch { colOrder = []; }
  if (colOrder.length > 0) {
    const sorted: GridColumn[] = [];
    const used = new Set<string>();

    const orderedLeafKeys = Array.from(new Set(
      colOrder
        .filter(key => key && !key.startsWith("m_") && !key.startsWith("m:"))
        .map(key => key.includes("::m") ? key.split("::m")[0] : key)
    ));

    for (const leafKey of orderedLeafKeys) {
      // Keep the leaf together. Older versions persisted individual
      // "<column>::m<n>" keys, which split new measures into duplicate
      // header leaves after calculated measures were added.
      const matches = baseResult.filter(c => c.col.key === leafKey);
      for (const match of matches) {
        if (!used.has(match.key)) {
          sorted.push(match);
          used.add(match.key);
        }
      }
    }

    // Add remaining columns not in manual order
    for (const col of baseResult) {
      if (!used.has(col.key)) {
        sorted.push(col);
      }
    }
    baseResult = sorted;
  }

  // Grouped YTD blocks go after any manual column order so they stay at the matrix edges.
  if (groupedYtdStart.length > 0 || groupedYtdEnd.length > 0) {
    baseResult = [...groupedYtdStart, ...baseResult, ...groupedYtdEnd];
  }

  let finalResult = baseResult;
  if (hiddenSet.size > 0) {
    finalResult = finalResult.filter(gc => {
      const stableMeasureIndex = gc.measure.index ?? gc.measureIndex;
      // hide by measure key ("m_N"). Check both visible index and stable measure index.
      if (hiddenSet.has(`m_${gc.measureIndex}`)) return false;
      if (hiddenSet.has(`m_${stableMeasureIndex}`)) return false;
      if (hiddenSet.has(`m:${gc.measureIndex}`)) return false;
      if (hiddenSet.has(`m:${stableMeasureIndex}`)) return false;
      if (hiddenSet.has(gc.key)) return false;
      // hide by exact column key or any hidden parent path.
      if (isHiddenColumn(gc.col)) return false;
      return true;
    });
  }

  return finalResult;
}
