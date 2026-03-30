/**
 * Search and Filter Module
 * Global search and column filtering for matrix
 */

export interface SearchConfig {
  query: string;
  searchIn: SearchTarget[];
  caseSensitive: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
}

export type SearchTarget = "rowHeaders" | "columnHeaders" | "values" | "notes";

export interface SearchResult {
  rowKey: string;
  colKey: string;
  field: SearchTarget;
  value: string;
  matchStart: number;
  matchEnd: number;
}

export interface FilterConfig {
  enabled: boolean;
  filters: ColumnFilter[];
  matchAll: boolean; // AND vs OR logic
}

export interface ColumnFilter {
  fieldId: string;
  fieldName: string;
  operator: FilterOperator;
  values: (string | number | boolean)[];
  exclude: boolean;
}

export type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "between"
  | "in"
  | "isEmpty"
  | "isNotEmpty";

export interface TopNConfig {
  enabled: boolean;
  n: number;
  byMeasure: string;
  direction: "top" | "bottom";
  scope: "overall" | "byParent";
}

// Default configurations
export const defaultSearchConfig: SearchConfig = {
  query: "",
  searchIn: ["rowHeaders", "columnHeaders", "values"],
  caseSensitive: false,
  matchWholeWord: false,
  useRegex: false,
};

export const defaultFilterConfig: FilterConfig = {
  enabled: false,
  filters: [],
  matchAll: true,
};

// Search functions
export function searchMatrix(
  config: SearchConfig,
  rowData: Map<string, any>,
  colData: Map<string, any>,
  cellData: Map<string, { value: any; formattedValue: string }>,
  notesData: Map<string, string>
): SearchResult[] {
  if (!config.query) return [];

  const results: SearchResult[] = [];
  const regex = buildSearchRegex(config);

  // Search row headers
  if (config.searchIn.includes("rowHeaders")) {
    for (const [key, value] of rowData) {
      const strValue = String(value);
      const matches = findMatches(strValue, regex);
      for (const match of matches) {
        results.push({
          rowKey: key,
          colKey: "",
          field: "rowHeaders",
          value: strValue,
          matchStart: match.start,
          matchEnd: match.end,
        });
      }
    }
  }

  // Search column headers
  if (config.searchIn.includes("columnHeaders")) {
    for (const [key, value] of colData) {
      const strValue = String(value);
      const matches = findMatches(strValue, regex);
      for (const match of matches) {
        results.push({
          rowKey: "",
          colKey: key,
          field: "columnHeaders",
          value: strValue,
          matchStart: match.start,
          matchEnd: match.end,
        });
      }
    }
  }

  // Search values
  if (config.searchIn.includes("values")) {
    for (const [key, cell] of cellData) {
      const strValue = String(cell.formattedValue);
      const matches = findMatches(strValue, regex);
      const [rowKey, colKey] = key.split("|");
      for (const match of matches) {
        results.push({
          rowKey,
          colKey,
          field: "values",
          value: strValue,
          matchStart: match.start,
          matchEnd: match.end,
        });
      }
    }
  }

  // Search notes
  if (config.searchIn.includes("notes")) {
    for (const [key, note] of notesData) {
      const matches = findMatches(note, regex);
      const [rowKey, colKey] = key.split("|");
      for (const match of matches) {
        results.push({
          rowKey,
          colKey,
          field: "notes",
          value: note,
          matchStart: match.start,
          matchEnd: match.end,
        });
      }
    }
  }

  return results;
}

function buildSearchRegex(config: SearchConfig): RegExp {
  let pattern = config.query;

  if (config.useRegex) {
    // User provided regex - use as-is
  } else {
    // Escape special regex characters
    pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (config.matchWholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
  }

  const flags = config.caseSensitive ? "g" : "gi";
  return new RegExp(pattern, flags);
}

function findMatches(text: string, regex: RegExp): Array<{ start: number; end: number }> {
  const matches: Array<{ start: number; end: number }> = [];
  let match;

  // Reset regex lastIndex
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
    });

    // Prevent infinite loop on zero-width matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  return matches;
}

// Filter functions
export function applyFilters(
  config: FilterConfig,
  data: any[],
  getFieldValue: (item: any, fieldId: string) => any
): any[] {
  if (!config.enabled || config.filters.length === 0) {
    return data;
  }

  return data.filter((item) => {
    const results = config.filters.map((filter) =>
      matchesFilter(item, filter, getFieldValue)
    );

    return config.matchAll
      ? results.every((r) => r) // AND
      : results.some((r) => r); // OR
  });
}

function matchesFilter(
  item: any,
  filter: ColumnFilter,
  getFieldValue: (item: any, fieldId: string) => any
): boolean {
  const value = getFieldValue(item, filter.fieldId);
  let matches = false;

  switch (filter.operator) {
    case "equals":
      matches = filter.values.some((v) => value === v);
      break;
    case "notEquals":
      matches = !filter.values.some((v) => value === v);
      break;
    case "contains":
      matches = filter.values.some((v) =>
        String(value).toLowerCase().includes(String(v).toLowerCase())
      );
      break;
    case "startsWith":
      matches = filter.values.some((v) =>
        String(value).toLowerCase().startsWith(String(v).toLowerCase())
      );
      break;
    case "endsWith":
      matches = filter.values.some((v) =>
        String(value).toLowerCase().endsWith(String(v).toLowerCase())
      );
      break;
    case "greaterThan":
      matches = filter.values.some((v) => Number(value) > Number(v));
      break;
    case "lessThan":
      matches = filter.values.some((v) => Number(value) < Number(v));
      break;
    case "between":
      if (filter.values.length >= 2) {
        const num = Number(value);
        matches = num >= Number(filter.values[0]) && num <= Number(filter.values[1]);
      }
      break;
    case "in":
      matches = filter.values.includes(value);
      break;
    case "isEmpty":
      matches = value === null || value === undefined || value === "";
      break;
    case "isNotEmpty":
      matches = value !== null && value !== undefined && value !== "";
      break;
  }

  return filter.exclude ? !matches : matches;
}

// Top N functions
export function applyTopN(
  config: TopNConfig,
  data: any[],
  getMeasureValue: (item: any) => number,
  getParentKey?: (item: any) => string
): any[] {
  if (!config.enabled) return data;

  if (config.scope === "overall") {
    // Sort and take top N overall
    const sorted = [...data].sort((a, b) => {
      const valA = getMeasureValue(a);
      const valB = getMeasureValue(b);
      return config.direction === "top" ? valB - valA : valA - valB;
    });
    return sorted.slice(0, config.n);
  } else {
    // Group by parent and take top N from each
    const groups = new Map<string, any[]>();

    for (const item of data) {
      const parentKey = getParentKey ? getParentKey(item) : "root";
      if (!groups.has(parentKey)) {
        groups.set(parentKey, []);
      }
      groups.get(parentKey)!.push(item);
    }

    const result: any[] = [];
    for (const [, group] of groups) {
      const sorted = [...group].sort((a, b) => {
        const valA = getMeasureValue(a);
        const valB = getMeasureValue(b);
        return config.direction === "top" ? valB - valA : valA - valB;
      });
      result.push(...sorted.slice(0, config.n));
    }

    return result;
  }
}

// Search highlight utility
export function highlightMatches(text: string, query: string, config: SearchConfig): string {
  if (!query) return text;

  const regex = buildSearchRegex(config);
  return text.replace(regex, (match) => `<mark>${match}</mark>`);
}

// Preset filters
export const filterPresets = {
  top10ByRevenue: (measureField: string): TopNConfig => ({
    enabled: true,
    n: 10,
    byMeasure: measureField,
    direction: "top",
    scope: "overall",
  }),

  bottom5BySales: (measureField: string): TopNConfig => ({
    enabled: true,
    n: 5,
    byMeasure: measureField,
    direction: "bottom",
    scope: "overall",
  }),

  positiveVariance: (varianceField: string): ColumnFilter => ({
    fieldId: varianceField,
    fieldName: "Variance",
    operator: "greaterThan",
    values: [0],
    exclude: false,
  }),

  negativeVariance: (varianceField: string): ColumnFilter => ({
    fieldId: varianceField,
    fieldName: "Variance",
    operator: "lessThan",
    values: [0],
    exclude: false,
  }),
};
