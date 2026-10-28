/**
 * Opt-in diagnostics. Silent unless enabled, so it costs nothing in normal use.
 *
 * Enable from the browser console of the report page:
 *   window.__MATRIXPRO_DEBUG__ = true
 * or persistently (where the host allows storage):
 *   localStorage.setItem("matrixproDebug", "1")
 */
export function isMatrixDebugEnabled(): boolean {
  try {
    if (typeof window !== "undefined" && (window as any).__MATRIXPRO_DEBUG__ === true) return true;
  } catch {
    // ignore
  }
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("matrixproDebug") === "1";
  } catch {
    // Sandboxed hosts may deny storage access.
    return false;
  }
}

export function debugMatrixData(dataView: any, model: any, buildMs?: number): void {
  if (!isMatrixDebugEnabled()) return;
  try {
    const matrix = dataView?.matrix;
    const valueSources = matrix?.valueSources || [];
    let rowNodes = 0;
    const countRows = (nodes: any[] | undefined) => {
      for (const node of nodes || []) {
        rowNodes++;
        countRows(node.children);
      }
    };
    countRows(matrix?.rows?.root?.children);

    // eslint-disable-next-line no-console
    console.info("[MatrixPro]", {
      modelBuildMs: buildMs === undefined ? "reused (inputs unchanged)" : Math.round(buildMs),
      rowNodes,
      measures: valueSources.map((v: any) => v.displayName),
      visibleRows: model?.flattenedRows?.length ?? 0,
      columns: model?.flattenedColumns?.length ?? 0,
      cells: model?.cellMap?.size ?? 0,
      moreDataPending: !!dataView?.metadata?.segment,
    });
  } catch {
    // Diagnostics must never break rendering.
  }
}
