import { FlattenedNode } from "./tree";
import { CellValue, MeasureInfo, getCellValue } from "./pivot";
import { VisualSettings } from "../settings/settings";

export type LevelAwareDisplayMode =
  | "distributed"
  | "detail"
  | "totalOnly"
  | "visual";

export type LevelAwareRowVisibility =
  | "all"
  | "parent"
  | "leaf"
  | "selected";

export type LevelAwareColumnGroupVisibility =
  | "all"
  | "selected"
  | "notRepeated";

export type LevelAwareAggregation =
  | "none"
  | "sum"
  | "first"
  | "last"
  | "average"
  | "min"
  | "max"
  | "count"
  | "countDistinct"
  | "formula";

export type LevelAwarePlacement =
  | "afterRowHeaders"
  | "beforeDistributed"
  | "afterDistributed"
  | "end"
  | "frozenWithRowHeaders";

export interface LevelAwareFieldConfig {
  id: string;
  measureIndex?: number;
  measureName?: string;
  measureId?: string;
  enabled?: boolean;
  hidden?: boolean;
  displayMode?: LevelAwareDisplayMode;
  rowVisibility?: LevelAwareRowVisibility;
  selectedRowLevels?: number[];
  columnGroupVisibility?: LevelAwareColumnGroupVisibility;
  selectedColumnKeys?: string[];
  aggregation?: LevelAwareAggregation;
  placement?: LevelAwarePlacement;
  order?: number;
}

export type RowFieldRole =
  | "hierarchy"
  | "detail"
  | "hiddenKey"
  | "groupingOnly";

export type RowFieldDisplayAt =
  | "all"
  | "parent"
  | "leaf"
  | "selected";

export type RowFieldPlacement =
  | "rowHeader"
  | "detailColumns"
  | "beforeDistributed"
  | "afterDistributed"
  | "hidden";

export type RowFieldAggregation =
  | "none"
  | "first"
  | "last"
  | "min"
  | "max"
  | "count"
  | "countDistinct"
  | "concatenate"
  | "sameElseMultiple";

export interface LevelAwareRowFieldConfig {
  id: string;
  levelIndex: number;
  fieldName?: string;
  enabled?: boolean;
  role?: RowFieldRole;
  displayAt?: RowFieldDisplayAt;
  selectedLevel?: number;
  placement?: RowFieldPlacement;
  aggregation?: RowFieldAggregation;
  order?: number;
}

export interface LevelAwareColumnsConfig {
  enabled?: boolean;
  fields?: LevelAwareFieldConfig[];
  rowFields?: LevelAwareRowFieldConfig[];
}

export const DEFAULT_LEVEL_AWARE_CONFIG: LevelAwareColumnsConfig = {
  enabled: false,
  fields: [],
  rowFields: [],
};

export function measureFieldId(measure: MeasureInfo, fallbackIndex: number): string {
  if (measure.id) return `id:${measure.id}`;
  if (measure.queryName) return `q:${measure.queryName}`;
  return `m:${measure.index ?? fallbackIndex}`;
}

export function parseLevelAwareColumns(raw: string | undefined): LevelAwareColumnsConfig {
  if (!raw) return DEFAULT_LEVEL_AWARE_CONFIG;
  try {
    const parsed = JSON.parse(raw) as LevelAwareColumnsConfig;
    return {
      enabled: parsed?.enabled === true,
      fields: Array.isArray(parsed?.fields) ? parsed.fields.filter(Boolean) : [],
      rowFields: Array.isArray(parsed?.rowFields) ? parsed.rowFields.filter(Boolean) : [],
    };
  } catch {
    return DEFAULT_LEVEL_AWARE_CONFIG;
  }
}

export function serializeLevelAwareColumns(config: LevelAwareColumnsConfig): string {
  return JSON.stringify({
    enabled: config.enabled === true,
    fields: Array.isArray(config.fields) ? config.fields : [],
    rowFields: Array.isArray(config.rowFields) ? config.rowFields : [],
  });
}

export function rowFieldId(levelIndex: number, fieldName?: string): string {
  return `row:${levelIndex}:${fieldName || ""}`;
}

export function upsertRowFieldConfig(
  config: LevelAwareColumnsConfig,
  levelIndex: number,
  fieldName: string | undefined,
  patch: Partial<LevelAwareRowFieldConfig>
): LevelAwareColumnsConfig {
  const id = rowFieldId(levelIndex, fieldName);
  const rowFields = [...(config.rowFields || [])];
  const existingIndex = rowFields.findIndex(field => field.id === id || field.levelIndex === levelIndex);
  const existing = existingIndex >= 0 ? rowFields[existingIndex] : undefined;
  const next: LevelAwareRowFieldConfig = {
    id,
    levelIndex,
    fieldName,
    enabled: true,
    role: "hierarchy",
    displayAt: "all",
    placement: "rowHeader",
    aggregation: "none",
    order: rowFields.length,
    ...existing,
    ...patch,
  };
  if (existingIndex >= 0) rowFields[existingIndex] = next;
  else rowFields.push(next);
  return { ...config, enabled: true, rowFields };
}

export function findRowFieldConfig(
  config: LevelAwareColumnsConfig,
  levelIndex: number
): LevelAwareRowFieldConfig | undefined {
  return (config.rowFields || []).find(field => field.levelIndex === levelIndex);
}

export function orderedRowDetailFields(config: LevelAwareColumnsConfig): LevelAwareRowFieldConfig[] {
  if (!config.enabled) return [];
  return (config.rowFields || [])
    .filter(field => field.enabled !== false)
    .filter(isVisibleRowDetailColumnField)
    .filter(field => field.placement !== "hidden")
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
}

function isVisibleRowDetailColumnField(field: LevelAwareRowFieldConfig): boolean {
  if ((field.role || "hierarchy") !== "detail") return false;
  const placement = field.placement || "detailColumns";
  return placement === "detailColumns" || placement === "beforeDistributed" || placement === "afterDistributed";
}

export function hiddenRowFieldLevels(config: LevelAwareColumnsConfig): Set<number> {
  const hidden = new Set<number>();
  if (!config.enabled) return hidden;
  for (const field of config.rowFields || []) {
    if (field.enabled === false) continue;
    const role = field.role || "hierarchy";
    if (role === "hierarchy") {
      if (field.placement === "hidden") hidden.add(field.levelIndex + 1);
      continue;
    }
    if (isVisibleRowDetailColumnField(field) || role === "hiddenKey" || role === "groupingOnly" || field.placement === "hidden") {
      hidden.add(field.levelIndex + 1);
    }
  }
  return hidden;
}

export function rowMatchesRowFieldDisplay(row: FlattenedNode, field: LevelAwareRowFieldConfig): boolean {
  // Totals/subtotals should never show row-detail (categorical/text) values —
  // they are aggregate rows, not individual records.  This check must come
  // before the displayAt logic so "all" doesn't accidentally include totals.
  if (row.isSubtotal || row.isGrandTotal) return false;

  const displayAt = field.displayAt || (field.role === "detail" ? "leaf" : "all");
  if (displayAt === "all") return true;

  const isLeafLike = !row.hasChildren;
  const isParentLike = row.hasChildren;
  if (displayAt === "leaf") return isLeafLike;
  if (displayAt === "parent") return isParentLike;
  if (displayAt === "selected") return field.selectedLevel === undefined || row.level === field.selectedLevel + 1;
  return true;
}

export function findFieldConfig(
  config: LevelAwareColumnsConfig,
  measure: MeasureInfo,
  fallbackIndex: number
): LevelAwareFieldConfig | undefined {
  const id = measureFieldId(measure, fallbackIndex);
  const stableIndex = measure.index ?? fallbackIndex;
  return (config.fields || []).find(field => {
    if (field.id === id) return true;
    if (field.measureId && measure.id && field.measureId === measure.id) return true;
    if (field.measureIndex !== undefined && field.measureIndex === stableIndex) return true;
    if (field.measureName && field.measureName.toLowerCase() === measure.name.toLowerCase()) return true;
    return false;
  });
}

export function upsertFieldConfig(
  config: LevelAwareColumnsConfig,
  measure: MeasureInfo,
  fallbackIndex: number,
  patch: Partial<LevelAwareFieldConfig>
): LevelAwareColumnsConfig {
  const id = measureFieldId(measure, fallbackIndex);
  const fields = [...(config.fields || [])];
  const existingIndex = fields.findIndex(field => field.id === id);
  const existing = existingIndex >= 0 ? fields[existingIndex] : undefined;
  const next: LevelAwareFieldConfig = {
    id,
    enabled: true,
    measureIndex: measure.index ?? fallbackIndex,
    measureName: measure.name,
    measureId: measure.id,
    displayMode: "distributed",
    rowVisibility: "all",
    columnGroupVisibility: "all",
    aggregation: "sum",
    placement: "beforeDistributed",
    order: fields.length,
    ...existing,
    ...patch,
  };
  if (existingIndex >= 0) fields[existingIndex] = next;
  else fields.push(next);
  return { ...config, enabled: true, fields };
}

export function orderedLevelAwareFields(
  config: LevelAwareColumnsConfig,
  measures: MeasureInfo[]
): Array<{ measure: MeasureInfo; measureIndex: number; field: LevelAwareFieldConfig }> {
  return measures
    .map((measure, measureIndex) => {
      const field = findFieldConfig(config, measure, measureIndex);
      return field ? { measure, measureIndex, field } : undefined;
    })
    .filter((item): item is { measure: MeasureInfo; measureIndex: number; field: LevelAwareFieldConfig } =>
      !!item && item.field.enabled !== false && item.field.hidden !== true
    )
    .sort((a, b) => (a.field.order ?? 9999) - (b.field.order ?? 9999));
}

export function isDetailField(field: LevelAwareFieldConfig | undefined): boolean {
  return field?.displayMode === "detail" || field?.columnGroupVisibility === "notRepeated";
}

export function isDistributedField(field: LevelAwareFieldConfig | undefined): boolean {
  if (field?.columnGroupVisibility === "notRepeated") return false;
  return !field || field.displayMode === undefined || field.displayMode === "distributed" || field.displayMode === "visual";
}

export function rowMatchesLevelAwareField(row: FlattenedNode, field: LevelAwareFieldConfig | undefined): boolean {
  if (!field || field.enabled === false || field.hidden === true) return true;
  // Any detail field (displayMode "detail" OR columnGroupVisibility
  // "notRepeated") defaults to "leaf" visibility so individual detail values
  // only render on the deepest hierarchy level, never on parent grouping rows.
  const visibility = field.rowVisibility || (isDetailField(field) ? "leaf" : "all");
  if (visibility === "all") return true;
  const isLeafLike = !row.hasChildren && !row.isSubtotal && !row.isGrandTotal;
  const isParentLike = row.hasChildren || row.isSubtotal || row.isGrandTotal;
  if (visibility === "leaf") return isLeafLike;
  if (visibility === "parent") return isParentLike;
  if (visibility === "selected") return !!field.selectedRowLevels?.includes(row.level);
  return true;
}

export function columnMatchesLevelAwareField(col: FlattenedNode, field: LevelAwareFieldConfig | undefined): boolean {
  if (!field || field.columnGroupVisibility !== "selected") return true;
  return !!field.selectedColumnKeys?.includes(col.key);
}

export function resolveDetailCell(
  cellMap: { get: (key: string) => CellValue | undefined },
  rowKey: string,
  columns: FlattenedNode[],
  measureIndex: number,
  options?: { isTotalRow?: boolean; aggregation?: LevelAwareAggregation }
): CellValue | undefined {
  // For total/subtotal rows, aggregate across all source columns instead of
  // picking the first non-null value.  Default aggregation is "sum" for totals
  // unless explicitly set to "none".
  if (options?.isTotalRow) {
    // Aggregate-row handling (parent grouping rows, subtotals, grand totals).
    // Detail columns collapse multiple column groups into one column, so the
    // aggregate must combine values from every source column.
    //
    // IMPORTANT: only NUMERIC detail columns aggregate.  Text/categorical
    // detail columns (account codes, descriptions, etc.) have no meaningful
    // aggregate, so they render blank on aggregate rows — this is what keeps
    // categorical details from appearing on parent/total rows.
    const agg = options.aggregation === "none" ? "sum" : (options.aggregation ?? "sum");

    // Collect numeric values across source columns. Track whether ANY cell had
    // data at all (to distinguish "text column" from "empty numeric column").
    const values: number[] = [];
    let sawAnyCell = false;
    let sawNonNumeric = false;
    for (const col of columns) {
      const cell = getCellValue(cellMap, rowKey, col.key, measureIndex);
      if (!cell) continue;
      sawAnyCell = true;
      if (cell.value !== null && !isNaN(Number(cell.value))) {
        values.push(Number(cell.value));
      } else if (cell.formattedValue && cell.formattedValue !== "—" && cell.value === null) {
        sawNonNumeric = true;
      }
    }

    // Text/categorical detail column → no aggregate, render blank.
    if (values.length === 0 && (sawNonNumeric || sawAnyCell)) {
      return undefined;
    }

    if (values.length === 0) {
      // Truly empty for this row — try a measure-only key as last resort.
      return getCellValue(cellMap, rowKey, `col:measure_${measureIndex}`, measureIndex) ?? undefined;
    }

    // For "first"/"last" aggregation, return a single source value
    if (agg === "first") {
      return getCellValue(cellMap, rowKey, columns[0].key, measureIndex) ?? undefined;
    }
    if (agg === "last") {
      return getCellValue(cellMap, rowKey, columns[columns.length - 1].key, measureIndex) ?? undefined;
    }

    let result: number;
    switch (agg) {
      case "sum": result = values.reduce((a, b) => a + b, 0); break;
      case "average": result = values.reduce((a, b) => a + b, 0) / values.length; break;
      case "min": result = Math.min(...values); break;
      case "max": result = Math.max(...values); break;
      case "count": result = values.length; break;
      case "countDistinct": result = new Set(values).size; break;
      default: result = values.reduce((a, b) => a + b, 0); break;
    }
    return {
      value: result,
      formattedValue: result.toLocaleString(),
      measureIndex,
      rowKey,
      colKey: columns.length > 0 ? columns[0].key : `col:measure_${measureIndex}`,
    };
  }

  // Non-total rows: pick the first non-null value across source columns
  for (const col of columns) {
    const cell = getCellValue(cellMap, rowKey, col.key, measureIndex);
    if (cell && (cell.value !== null || (cell.formattedValue && cell.formattedValue !== "—"))) {
      return cell;
    }
  }
  return columns.length > 0
    ? getCellValue(cellMap, rowKey, columns[0].key, measureIndex)
    : getCellValue(cellMap, rowKey, `col:measure_${measureIndex}`, measureIndex);
}

export function getLevelAwareConfig(settings: VisualSettings): LevelAwareColumnsConfig {
  return parseLevelAwareColumns(settings.calculations.levelAwareColumns);
}
