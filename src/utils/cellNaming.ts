import { FlattenedNode } from "../model/tree";
import { MeasureInfo } from "../model/pivot";

/**
 * Generates a human-readable cell reference for use in formulas and the formula bar.
 * Uses hierarchical naming when available, falls back to R1C1 notation.
 */
export function generateCellReference(
    row: FlattenedNode,
    col: FlattenedNode,
    measure: MeasureInfo,
    rowIndex?: number,
    colIndex?: number
): string {
    // Build hierarchical path for row
    const rowPath = row.path && row.path.length > 0
        ? row.path.join("|")
        : row.label;

    // Build hierarchical path for column
    const colPath = col.path && col.path.length > 0
        ? col.path.join("|")
        : col.label;

    // Combine with measure name
    const fullPath = `${rowPath}|${colPath}|${measure.name}`;

    // If the path is too generic or empty, fall back to R1C1
    if (!rowPath || !colPath || rowPath === "Total" || colPath === "Total") {
        if (rowIndex !== undefined && colIndex !== undefined) {
            return `R${rowIndex + 1}C${colIndex + 1}`;
        }
    }

    return fullPath;
}

/**
 * Generates an Excel-style alphanumeric cell reference (A1, B2, AA1, etc.)
 */
export function generateAlphanumericRef(rowIndex: number, colIndex: number): string {
    let columnLabel = "";
    let col = colIndex;

    // Convert column index to letters (A, B, ..., Z, AA, AB, ...)
    while (col >= 0) {
        columnLabel = String.fromCharCode(65 + (col % 26)) + columnLabel;
        col = Math.floor(col / 26) - 1;
    }

    return `${columnLabel}${rowIndex + 1}`;
}

/**
 * Generates a simplified cell label for display in the formula bar address box.
 * Shows the most relevant parts of the hierarchy without being too verbose.
 */
export function generateCellLabel(
    row: FlattenedNode,
    col: FlattenedNode,
    measure: MeasureInfo,
    rowIndex?: number,
    colIndex?: number
): string {
    // For simple grids, use alphanumeric
    if (rowIndex !== undefined && colIndex !== undefined) {
        const hasSimpleRow = !row.path || row.path.length <= 1;
        const hasSimpleCol = !col.path || col.path.length <= 1;

        if (hasSimpleRow && hasSimpleCol) {
            return generateAlphanumericRef(rowIndex, colIndex);
        }
    }

    // For hierarchical data, show last level of each dimension
    const rowLabel = row.label || `R${(rowIndex || 0) + 1}`;
    const colLabel = col.label || `C${(colIndex || 0) + 1}`;

    // If there's only one measure, omit it from the label
    // Otherwise include it for clarity
    return `${rowLabel}|${colLabel}`;
}

/**
 * Escapes a cell reference for use in formulas.
 * Wraps in quotes if it contains special characters.
 */
export function escapeCellReference(ref: string): string {
    // If reference contains spaces, pipes, or special chars, wrap in quotes
    if (/[\s|,()[\]]/.test(ref)) {
        return `"${ref.replace(/"/g, '""')}"`;
    }
    return ref;
}

/**
 * Formats a cell reference for insertion into a formula.
 * Uses CELL() function syntax for complex references.
 */
export function formatCellReferenceForFormula(
    row: FlattenedNode,
    col: FlattenedNode,
    measure: MeasureInfo
): string {
    const rowRef = escapeCellReference(row.label);
    const colRef = escapeCellReference(col.label);
    const measureRef = escapeCellReference(measure.name);

    return `CELL(${rowRef}, ${colRef}, ${measureRef})`;
}
