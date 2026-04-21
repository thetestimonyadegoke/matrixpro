import powerbi from "powerbi-visuals-api";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;

// Loosely typed selection id wrapper so we can call equals/getKey without SDK type mismatches
type SelectionId = any;

export interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
}

export function createSelectionState(): SelectionState {
  return {
    selectedIds: new Set(),
    lastSelectedId: null,
  };
}

export class SelectionManagerWrapper {
  private selectionManager: ISelectionManager;
  private host: powerbi.extensibility.visual.IVisualHost;

  constructor(host: powerbi.extensibility.visual.IVisualHost) {
    this.host = host;
    this.selectionManager = host.createSelectionManager();
  }

  async select(selectionId: SelectionId, multiSelect: boolean = false): Promise<SelectionId[]> {
    // Guard: Power BI host crashes with "Cannot read properties of null (reading 'valueDetails')"
    // inside VisualContainerDataSelectionService.getSelectedValues if a null/undefined id is passed.
    // Subtotal / grand-total / calculated rows legitimately have no selectionId, so a click on
    // one of those cells must not be forwarded to the host selection pipeline.
    if (!selectionId) {
      // Treat as a "clear selection" gesture when not multi-selecting, otherwise a no-op.
      if (!multiSelect) {
        try {
          await this.selectionManager.clear();
        } catch (error) {
          console.error("Clear selection error:", error);
        }
      }
      return this.selectionManager.getSelectionIds();
    }
    try {
      return await this.selectionManager.select(selectionId, multiSelect);
    } catch (error) {
      console.error("Selection error:", error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await this.selectionManager.clear();
    } catch (error) {
      console.error("Clear selection error:", error);
    }
  }

  getSelectionIds(): SelectionId[] {
    return this.selectionManager.getSelectionIds();
  }

  hasSelection(): boolean {
    return this.selectionManager.hasSelection();
  }

  registerOnSelectCallback(callback: (ids: SelectionId[]) => void): void {
    this.selectionManager.registerOnSelectCallback(callback);
  }

  createSelectionIdBuilder(): ISelectionIdBuilder {
    return this.host.createSelectionIdBuilder();
  }

  showContextMenu(selectionId: SelectionId, position: { x: number; y: number }): void {
    // Same guard as select(): passing null/undefined triggers a host-side crash in
    // getSelectedValues when the menu commands try to resolve the clicked data point.
    // For rows without an identity (totals/calculated), fall back to an empty selection
    // so the visual still shows the default context menu without throwing.
    try {
      if (!selectionId) {
        this.selectionManager.showContextMenu({} as any, position);
        return;
      }
      this.selectionManager.showContextMenu(selectionId, position);
    } catch (error) {
      console.error("Context menu error:", error);
    }
  }
}

export function buildSelectionId(
  builder: ISelectionIdBuilder,
  identity: any
): SelectionId {
  return builder.withMatrixNode(identity, []).createSelectionId();
}

export function isSelected(
  selectionIds: SelectionId[],
  targetId: SelectionId | undefined
): boolean {
  if (!targetId || selectionIds.length === 0) {
    return false;
  }

  return selectionIds.some(id => id.equals(targetId));
}

export function getSelectionIdKey(selectionId: SelectionId): string {
  return selectionId.getKey();
}

export function updateSelectionState(
  state: SelectionState,
  selectionIds: SelectionId[]
): SelectionState {
  const selectedIds = new Set<string>();
  let lastSelectedId: string | null = null;

  for (const id of selectionIds) {
    const key = id.getKey();
    selectedIds.add(key);
    lastSelectedId = key;
  }

  return {
    selectedIds,
    lastSelectedId,
  };
}

export function isRowSelected(
  state: SelectionState,
  rowSelectionId: SelectionId | undefined
): boolean {
  if (!rowSelectionId) {
    return state.selectedIds.size === 0;
  }

  return state.selectedIds.has(rowSelectionId.getKey());
}
