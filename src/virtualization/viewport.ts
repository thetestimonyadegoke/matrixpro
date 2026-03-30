export interface ViewportRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

export interface ViewportConfig {
  rowHeight: number;
  columnWidth: number;
  rowBuffer: number;
  columnBuffer: number;
  viewportWidth: number;
  viewportHeight: number;
  totalRows: number;
  totalColumns: number;
  rowHeaderWidth: number;
  columnHeaderHeight: number;
}

export function computeVisibleRange(
  scrollTop: number,
  scrollLeft: number,
  config: ViewportConfig
): ViewportRange {
  const {
    rowHeight,
    columnWidth,
    rowBuffer,
    columnBuffer,
    viewportWidth,
    viewportHeight,
    totalRows,
    totalColumns,
  } = config;

  const visibleRowCount = Math.ceil(viewportHeight / rowHeight);
  const visibleColCount = Math.ceil(viewportWidth / columnWidth);

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - rowBuffer);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / rowHeight) + rowBuffer);

  const startCol = Math.max(0, Math.floor(scrollLeft / columnWidth) - columnBuffer);
  const endCol = Math.min(totalColumns, Math.ceil((scrollLeft + viewportWidth) / columnWidth) + columnBuffer);

  return {
    startRow,
    endRow: Math.max(startRow, endRow),
    startCol,
    endCol: Math.max(startCol, endCol),
  };
}

export function getRowOffset(rowIndex: number, rowHeight: number): number {
  return rowIndex * rowHeight;
}

export function getColumnOffset(colIndex: number, columnWidth: number): number {
  return colIndex * columnWidth;
}

export function getTotalContentHeight(totalRows: number, rowHeight: number): number {
  return totalRows * rowHeight;
}

export function getTotalContentWidth(totalColumns: number, columnWidth: number): number {
  return totalColumns * columnWidth;
}

export function isRowVisible(rowIndex: number, range: ViewportRange): boolean {
  return rowIndex >= range.startRow && rowIndex < range.endRow;
}

export function isColumnVisible(colIndex: number, range: ViewportRange): boolean {
  return colIndex >= range.startCol && colIndex < range.endCol;
}

export function getVisibleRowIndices(range: ViewportRange): number[] {
  const indices: number[] = [];
  for (let i = range.startRow; i < range.endRow; i++) {
    indices.push(i);
  }
  return indices;
}

export function getVisibleColumnIndices(range: ViewportRange): number[] {
  const indices: number[] = [];
  for (let i = range.startCol; i < range.endCol; i++) {
    indices.push(i);
  }
  return indices;
}

export interface ColumnWidthMap {
  widths: Map<number, number>;
  defaultWidth: number;
}

export function createColumnWidthMap(defaultWidth: number): ColumnWidthMap {
  return {
    widths: new Map(),
    defaultWidth,
  };
}

export function getColumnWidth(map: ColumnWidthMap, colIndex: number): number {
  return map.widths.get(colIndex) ?? map.defaultWidth;
}

export function setColumnWidth(map: ColumnWidthMap, colIndex: number, width: number): ColumnWidthMap {
  const newWidths = new Map(map.widths);
  newWidths.set(colIndex, width);
  return { ...map, widths: newWidths };
}

export function getColumnOffsetWithVariableWidths(
  map: ColumnWidthMap,
  colIndex: number
): number {
  let offset = 0;
  for (let i = 0; i < colIndex; i++) {
    offset += getColumnWidth(map, i);
  }
  return offset;
}

export function getTotalWidthWithVariableWidths(
  map: ColumnWidthMap,
  totalColumns: number
): number {
  let total = 0;
  for (let i = 0; i < totalColumns; i++) {
    total += getColumnWidth(map, i);
  }
  return total;
}

export function computeVisibleRangeWithVariableWidths(
  scrollTop: number,
  scrollLeft: number,
  config: ViewportConfig,
  columnWidthMap: ColumnWidthMap
): ViewportRange {
  const {
    rowHeight,
    rowBuffer,
    columnBuffer,
    viewportWidth,
    viewportHeight,
    totalRows,
    totalColumns,
  } = config;

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - rowBuffer);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / rowHeight) + rowBuffer);

  let startCol = 0;
  let accumulatedWidth = 0;
  for (let i = 0; i < totalColumns; i++) {
    const colWidth = getColumnWidth(columnWidthMap, i);
    if (accumulatedWidth + colWidth > scrollLeft) {
      startCol = Math.max(0, i - columnBuffer);
      break;
    }
    accumulatedWidth += colWidth;
  }

  let endCol = totalColumns;
  accumulatedWidth = 0;
  for (let i = 0; i < totalColumns; i++) {
    accumulatedWidth += getColumnWidth(columnWidthMap, i);
    if (accumulatedWidth > scrollLeft + viewportWidth) {
      endCol = Math.min(totalColumns, i + 1 + columnBuffer);
      break;
    }
  }

  return {
    startRow,
    endRow: Math.max(startRow, endRow),
    startCol,
    endCol: Math.max(startCol, endCol),
  };
}
