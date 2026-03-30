/**
 * Multiple Hierarchies Management
 * Support for drag-drop hierarchy configuration
 */

export interface Field {
  id: string;
  name: string;
  displayName: string;
  dataType: "string" | "number" | "date" | "boolean";
  isMeasure: boolean;
  isHierarchy: boolean;
  isSortable: boolean;
  isFilterable: boolean;
}

export interface HierarchyLevel {
  fieldId: string;
  fieldName: string;
  level: number;
  displayName: string;
  sortOrder: "asc" | "desc" | "none";
  showSubtotal: boolean;
  expandByDefault: boolean;
}

export interface FieldPlacement {
  rowHierarchies: HierarchyLevel[];
  columnHierarchies: HierarchyLevel[];
  measures: Field[];
  filters: FilterItem[];
  values: string[]; // measure values in values area
}

export interface FilterItem {
  fieldId: string;
  fieldName: string;
  operator: FilterOperator;
  value: string | number | string[] | number[] | null;
}

export type FilterOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  | "between"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "in"
  | "notIn"
  | "isEmpty"
  | "isNotEmpty";

export interface PivotState {
  fieldPlacement: FieldPlacement;
  availableFields: Field[];
  lastModified: number;
  modifiedBy: string;
}

// Drag-drop operation types
export type DropZone = "rows" | "columns" | "values" | "filters";

export interface DragDropState {
  draggedField: Field | null;
  sourceZone: DropZone | null;
  targetZone: DropZone | null;
  targetIndex: number | null;
  isDragging: boolean;
}

export interface PivotOperation {
  type: "add" | "remove" | "reorder" | "move";
  field: Field;
  sourceZone: DropZone | null;
  targetZone: DropZone;
  sourceIndex?: number;
  targetIndex: number;
}

// Default empty state
export const defaultPivotState: PivotState = {
  fieldPlacement: {
    rowHierarchies: [],
    columnHierarchies: [],
    measures: [],
    filters: [],
    values: [],
  },
  availableFields: [],
  lastModified: Date.now(),
  modifiedBy: "",
};

// Field factory helpers
export function createField(
  name: string,
  options: Partial<Omit<Field, "id" | "name">> = {}
): Field {
  return {
    id: `field_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
    name,
    displayName: options.displayName || name,
    dataType: options.dataType || "string",
    isMeasure: options.isMeasure ?? false,
    isHierarchy: options.isHierarchy ?? !options.isMeasure,
    isSortable: options.isSortable ?? true,
    isFilterable: options.isFilterable ?? true,
    ...options,
  };
}

export function createHierarchyLevel(field: Field, level: number): HierarchyLevel {
  return {
    fieldId: field.id,
    fieldName: field.name,
    level,
    displayName: field.displayName,
    sortOrder: "asc",
    showSubtotal: true,
    expandByDefault: level === 0,
  };
}

// Pivot operation handlers
export function addFieldToZone(
  state: PivotState,
  field: Field,
  zone: DropZone,
  index: number = -1
): PivotState {
  const newState = structuredClone(state);
  const placement = newState.fieldPlacement;

  switch (zone) {
    case "rows":
      if (!field.isMeasure) {
        const level = createHierarchyLevel(field, placement.rowHierarchies.length);
        if (index >= 0) {
          placement.rowHierarchies.splice(index, 0, level);
        } else {
          placement.rowHierarchies.push(level);
        }
        // Re-level all hierarchies
        placement.rowHierarchies.forEach((h, i) => (h.level = i));
      }
      break;
    case "columns":
      if (!field.isMeasure) {
        const level = createHierarchyLevel(field, placement.columnHierarchies.length);
        if (index >= 0) {
          placement.columnHierarchies.splice(index, 0, level);
        } else {
          placement.columnHierarchies.push(level);
        }
        placement.columnHierarchies.forEach((h, i) => (h.level = i));
      }
      break;
    case "values":
      if (field.isMeasure) {
        if (index >= 0) {
          placement.measures.splice(index, 0, field);
        } else {
          placement.measures.push(field);
        }
        placement.values = placement.measures.map((m) => m.name);
      }
      break;
    case "filters":
      if (!field.isMeasure) {
        placement.filters.push({
          fieldId: field.id,
          fieldName: field.name,
          operator: "equals",
          value: null,
        });
      }
      break;
  }

  // Remove from available fields
  newState.availableFields = newState.availableFields.filter((f) => f.id !== field.id);
  newState.lastModified = Date.now();

  return newState;
}

export function removeFieldFromZone(
  state: PivotState,
  fieldId: string,
  zone: DropZone,
  index: number
): PivotState {
  const newState = structuredClone(state);
  const placement = newState.fieldPlacement;

  switch (zone) {
    case "rows":
      placement.rowHierarchies.splice(index, 1);
      placement.rowHierarchies.forEach((h, i) => (h.level = i));
      break;
    case "columns":
      placement.columnHierarchies.splice(index, 1);
      placement.columnHierarchies.forEach((h, i) => (h.level = i));
      break;
    case "values":
      placement.measures.splice(index, 1);
      placement.values = placement.measures.map((m) => m.name);
      break;
    case "filters":
      placement.filters.splice(index, 1);
      break;
  }

  // Return to available fields if it's a custom field
  // (We don't have the full field info here, so this would need the field passed in)
  newState.lastModified = Date.now();

  return newState;
}

export function reorderFieldInZone(
  state: PivotState,
  zone: DropZone,
  fromIndex: number,
  toIndex: number
): PivotState {
  const newState = structuredClone(state);
  const placement = newState.fieldPlacement;

  let array: any[];
  switch (zone) {
    case "rows":
      array = placement.rowHierarchies;
      break;
    case "columns":
      array = placement.columnHierarchies;
      break;
    case "values":
      array = placement.measures;
      break;
    default:
      return state;
  }

  const [moved] = array.splice(fromIndex, 1);
  array.splice(toIndex, 0, moved);

  // Re-level hierarchies
  if (zone === "rows" || zone === "columns") {
    array.forEach((h, i) => (h.level = i));
  }
  if (zone === "values") {
    placement.values = placement.measures.map((m) => m.name);
  }

  newState.lastModified = Date.now();
  return newState;
}

export function moveFieldBetweenZones(
  state: PivotState,
  field: Field,
  sourceZone: DropZone,
  sourceIndex: number,
  targetZone: DropZone,
  targetIndex: number
): PivotState {
  // Remove from source
  let tempState = removeFieldFromZone(state, field.id, sourceZone, sourceIndex);
  
  // If field is a measure and moving to values zone, add it
  if (targetZone === "values" && field.isMeasure) {
    return addFieldToZone(tempState, field, targetZone, targetIndex);
  }
  
  // If field is a hierarchy and moving to rows/columns/filters
  if (!field.isMeasure && (targetZone === "rows" || targetZone === "columns" || targetZone === "filters")) {
    return addFieldToZone(tempState, field, targetZone, targetIndex);
  }

  return tempState;
}

// Preset configurations for common pivot setups
export const pivotPresets = {
  // Sales by Region and Time
  salesByRegionAndTime: (fields: Field[]): PivotState => {
    const region = fields.find((f) => f.name.toLowerCase().includes("region"));
    const year = fields.find((f) => f.name.toLowerCase().includes("year"));
    const revenue = fields.find((f) => f.name.toLowerCase().includes("revenue"));

    const state = structuredClone(defaultPivotState);
    state.availableFields = fields;

    if (region) {
      state.fieldPlacement.rowHierarchies.push(createHierarchyLevel(region, 0));
    }
    if (year) {
      state.fieldPlacement.columnHierarchies.push(createHierarchyLevel(year, 0));
    }
    if (revenue) {
      state.fieldPlacement.measures.push(revenue);
      state.fieldPlacement.values = [revenue.name];
    }

    return state;
  },

  // Products by Category
  productsByCategory: (fields: Field[]): PivotState => {
    const category = fields.find((f) => f.name.toLowerCase().includes("category"));
    const product = fields.find((f) => f.name.toLowerCase().includes("product"));
    const sales = fields.find((f) => f.name.toLowerCase().includes("sales"));

    const state = structuredClone(defaultPivotState);
    state.availableFields = fields;

    if (category) {
      state.fieldPlacement.rowHierarchies.push(createHierarchyLevel(category, 0));
    }
    if (product) {
      state.fieldPlacement.rowHierarchies.push(createHierarchyLevel(product, 1));
    }
    if (sales) {
      state.fieldPlacement.measures.push(sales);
      state.fieldPlacement.values = [sales.name];
    }

    return state;
  },

  // Time Analysis
  timeAnalysis: (fields: Field[]): PivotState => {
    const year = fields.find((f) => f.name.toLowerCase().includes("year"));
    const quarter = fields.find((f) => f.name.toLowerCase().includes("quarter"));
    const month = fields.find((f) => f.name.toLowerCase().includes("month"));

    const state = structuredClone(defaultPivotState);
    state.availableFields = fields;

    if (year) {
      state.fieldPlacement.rowHierarchies.push(createHierarchyLevel(year, 0));
    }
    if (quarter) {
      state.fieldPlacement.rowHierarchies.push(createHierarchyLevel(quarter, 1));
    }
    if (month) {
      state.fieldPlacement.rowHierarchies.push(createHierarchyLevel(month, 2));
    }

    return state;
  },
};
