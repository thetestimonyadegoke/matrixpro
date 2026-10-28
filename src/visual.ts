import powerbi from "powerbi-visuals-api";
import * as React from "react";
import * as ReactDOM from "react-dom";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import { App } from "./ui/App";
import { parseSettings, VisualSettings } from "./settings/settings";
import { getFormattingModel } from "./settings/formattingModel";
import { buildMatrixModel, MatrixModel } from "./model/pivot";
import { toggleNodeExpansion } from "./model/tree";
import { SelectionManagerWrapper } from "./powerbi/selection";
import { RenderingEventsManager } from "./powerbi/events";
import { TooltipServiceWrapper } from "./powerbi/tooltip";
import { getThemePreset, applyThemeTokensToElement, ThemePresetId } from "./themes/themeTokens";
import { debugMatrixData } from "./debug_logger";
import { setExportDownloadService } from "./export/download";
import { MatrixErrorBoundary } from "./ui/errorBoundary";

import "../style/visual.less";

export class Visual implements IVisual {
  private target: HTMLElement;
  private host: IVisualHost;
  private selectionManager: SelectionManagerWrapper;
  private renderingEvents: RenderingEventsManager;
  private settings!: VisualSettings;
  private model!: MatrixModel;
  private lastDataView: powerbi.DataView | undefined;
  private lastViewport: { width: number; height: number } | null;
  private rebuildQueued: boolean;
  private rowExpandedState: Map<string, boolean>;
  private columnExpandedState: Map<string, boolean>;
  private reactRoot: HTMLElement;
  private tooltipServiceWrapper: TooltipServiceWrapper | null;
  private allowInteractions: boolean;
  private isHighContrast: boolean;
  private highContrastForeground: string;
  private highContrastBackground: string;
  private highContrastForegroundSelected: string;
  private highContrastHyperlink: string;
  private pendingPropertyOverrides: Map<string, { value: any; expiresAt: number }>;
  /** Inputs the current model was built from; a match means a rebuild would produce the same model. */
  private modelInputs: {
    matrix: powerbi.DataViewMatrix | undefined;
    shape: string;
    signature: string;
    rowExpandedState: Map<string, boolean>;
    columnExpandedState: Map<string, boolean>;
  } | null = null;
  private pendingForceRebuild = false;
  private loadingSegments = false;

  private tryHexToRgb(hex: string): { r: number; g: number; b: number } | null {
    if (!hex) return null;
    let h = hex.trim();
    if (h.startsWith("#")) h = h.slice(1);
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      if ([r, g, b].some(n => Number.isNaN(n))) return null;
      return { r, g, b };
    }
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if ([r, g, b].some(n => Number.isNaN(n))) return null;
      return { r, g, b };
    }
    return null;
  }

  private isColorProperty(objectName: string, propertyName: string): boolean {
    return new Set([
      "theme.customAccentColor",
      "headers.backgroundColor",
      "headers.textColor",
      "headers.rowHeaderParentColor",
      "headers.rowHeaderChildColor",
      "headers.colHeaderLevel0Color",
      "headers.colHeaderLevel1Color",
      "headers.colHeaderLeafColor",
      "values.textColor",
      "values.backgroundColor",
      "values.borderColor",
      "totals.backgroundColor",
      "totals.textColor",
      "totals.grandTotalBackgroundColor",
      "totals.grandTotalTextColor",
      "totals.subtotalBackgroundColor",
      "totals.subtotalTextColor",
      "conditionalFormatting.lowColor",
      "conditionalFormatting.midColor",
      "conditionalFormatting.highColor",
      "dataBars.positiveColor",
      "dataBars.negativeColor",
      "kpiIcons.upColor",
      "kpiIcons.neutralColor",
      "kpiIcons.downColor",
      "sparklines.lineColor",
      "sparklines.markerColor",
      "appearance.surfaceColor",
      "appearance.toolbarBackgroundColor",
      "appearance.borderColor",
      "appearance.accentColor",
      "appearance.gradientStart",
      "appearance.gradientEnd",
      "appearance.overlayColor",
      "title.color",
      "title.backgroundColor",
    ]).has(`${objectName}.${propertyName}`);
  }

  /**
   * Whether the value parsed back from the dataView matches the value we
   * optimistically persisted. Colors are compared case-insensitively because
   * the host may normalize the hex (e.g. "#FF0000" -> "#ff0000"); an exact
   * comparison would never match and the override would linger until expiry.
   */
  private persistedValueMatches(objectName: string, propertyName: string, current: any, pending: any): boolean {
    if (this.isColorProperty(objectName, propertyName) && typeof current === "string" && typeof pending === "string") {
      return current.trim().toLowerCase() === pending.trim().toLowerCase();
    }
    return current === pending;
  }

  private normalizePersistedValue(objectName: string, propertyName: string, value: any): any {
    if (!this.isColorProperty(objectName, propertyName)) {
      return value;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    const normalized = value.trim();
    return {
      solid: {
        color: normalized,
      },
    };
  }

  constructor(options: VisualConstructorOptions) {
    this.target = options.element;
    this.host = options.host;
    this.selectionManager = new SelectionManagerWrapper(this.host);
    this.renderingEvents = new RenderingEventsManager(this.host.eventService);
    this.rowExpandedState = new Map();
    this.columnExpandedState = new Map();
    this.lastDataView = undefined;
    this.lastViewport = null;
    this.rebuildQueued = false;
    this.pendingPropertyOverrides = new Map();

    this.allowInteractions = !!this.host.hostCapabilities?.allowInteractions;

    const palette: any = this.host.colorPalette as any;
    this.isHighContrast = !!palette?.isHighContrast;
    this.highContrastForeground = palette?.foreground?.value ?? "";
    this.highContrastBackground = palette?.background?.value ?? "";
    this.highContrastForegroundSelected = palette?.foregroundSelected?.value ?? "";
    this.highContrastHyperlink = palette?.hyperlink?.value ?? "";

    const tooltipService: any = (this.host as any).tooltipService;
    this.tooltipServiceWrapper = tooltipService ? new TooltipServiceWrapper(tooltipService) : null;

    this.reactRoot = document.createElement("div");
    this.reactRoot.className = "advanced-matrix-root";
    this.reactRoot.style.width = "100%";
    this.reactRoot.style.height = "100%";
    this.reactRoot.style.overflow = "hidden";
    this.reactRoot.setAttribute("tabindex", "0");
    this.tooltipServiceWrapper?.setElement(this.reactRoot);
    
    // Prevent the visual host container from rendering scrollbars or scrolling when focused
    this.target.style.overflow = "hidden";
    this.target.appendChild(this.reactRoot);

    // Exports must go through the host download service: the visual runs in a
    // sandboxed frame where a plain <a download> link is blocked.
    setExportDownloadService(this.host.downloadService);
  }

  private collectKeys(node: any, out: Set<string>): void {
    if (!node) return;
    if (node.key) out.add(node.key);
    if (node.children) {
      for (const c of node.children) {
        this.collectKeys(c, out);
      }
    }
  }

  private pruneExpansionState(): void {
    const rowKeys = new Set<string>();
    const colKeys = new Set<string>();
    this.collectKeys(this.model?.rowTree, rowKeys);
    this.collectKeys(this.model?.columnTree, colKeys);

    if (rowKeys.size > 0) {
      this.rowExpandedState = new Map(
        Array.from(this.rowExpandedState.entries()).filter(([k]) => rowKeys.has(k))
      );
    }

    if (colKeys.size > 0) {
      this.columnExpandedState = new Map(
        Array.from(this.columnExpandedState.entries()).filter(([k]) => colKeys.has(k))
      );
    }
  }

  /**
   * Settings that buildMatrixModel reads. Everything else (colors, fonts,
   * widths, zoom, panel state...) only affects rendering, so changing it must
   * not trigger a full re-pivot.
   */
  private modelSettingsSignature(settings: VisualSettings): string {
    return JSON.stringify([
      settings.totals,
      settings.calculations?.rows,
      settings.calculations?.measures,
      settings.manualData?.edits,
      settings.manualData?.labelOverrides,
      settings.manualData?.rowOrder,
    ]);
  }

  private dataShape(dataView: powerbi.DataView | undefined): string {
    const matrix = dataView?.matrix;
    if (!matrix) return "none";
    return [
      matrix.rows?.root?.children?.length ?? 0,
      matrix.columns?.root?.children?.length ?? 0,
      matrix.valueSources?.length ?? 0,
      dataView?.metadata?.segment ? 1 : 0,
    ].join("/");
  }

  /** Builds the model unless its inputs are unchanged since the last build. */
  /** @returns build time in ms, or undefined when the existing model was reused. */
  private ensureModel(dataView: powerbi.DataView | undefined, force: boolean): number | undefined {
    const signature = this.modelSettingsSignature(this.settings);
    const shape = this.dataShape(dataView);
    const inputs = this.modelInputs;
    if (
      !force &&
      this.model &&
      inputs &&
      inputs.matrix === dataView?.matrix &&
      inputs.shape === shape &&
      inputs.signature === signature &&
      inputs.rowExpandedState === this.rowExpandedState &&
      inputs.columnExpandedState === this.columnExpandedState
    ) {
      return undefined;
    }

    const started = performance.now();
    this.model = buildMatrixModel({
      dataView,
      settings: this.settings,
      selectionIdBuilder: (identity: any, levels?: powerbi.DataViewHierarchyLevel[]) => this.buildSelectionId(identity, levels),
      rowExpandedState: this.rowExpandedState,
      columnExpandedState: this.columnExpandedState,
    });

    this.pruneExpansionState();

    this.modelInputs = {
      matrix: dataView?.matrix,
      shape,
      signature,
      rowExpandedState: this.rowExpandedState,
      columnExpandedState: this.columnExpandedState,
    };
    return performance.now() - started;
  }

  /**
   * @param force rebuild even when inputs look unchanged. Interaction handlers
   * (expand/collapse/drill) force; persisted-setting changes do not, so purely
   * cosmetic changes skip the re-pivot.
   */
  private scheduleRebuildAndRender(force = true): void {
    this.pendingForceRebuild = this.pendingForceRebuild || force;
    if (this.rebuildQueued) return;
    this.rebuildQueued = true;

    requestAnimationFrame(() => {
      this.rebuildQueued = false;
      const forceRebuild = this.pendingForceRebuild;
      this.pendingForceRebuild = false;

      this.ensureModel(this.lastDataView, forceRebuild);

      const width = this.lastViewport?.width ?? this.target.clientWidth;
      const height = this.lastViewport?.height ?? this.target.clientHeight;
      this.render(width, height);
    });
  }

  /** @returns true when the host accepted a request for another data segment. */
  private requestMoreDataIfSegmented(dataView: powerbi.DataView | undefined): boolean {
    if (!dataView?.metadata?.segment) {
      return false;
    }

    try {
      return this.host.fetchMoreData(true) !== false;
    } catch (error) {
      console.warn("fetchMoreData failed:", error);
      return false;
    }
  }

  private persistProperty(objectName: string, propertyName: string, value: any): void {
    const normalizedValue = this.normalizePersistedValue(objectName, propertyName, value);
    if (this.isColorProperty(objectName, propertyName) && normalizedValue === undefined) {
      return;
    }
    const propertyKey = `${objectName}.${propertyName}`;
    // Hold the optimistic value until the host round-trips it back through the
    // dataView (confirmed in applyPendingPropertyOverrides). The long backstop is
    // only a safety net for genuinely dropped writes — a short TTL used to make
    // colors (e.g. header background) silently revert to defaults after ~30s.
    this.pendingPropertyOverrides.set(propertyKey, {
      value,
      expiresAt: Date.now() + 600000,
    });

    try {
      (this.host as any).persistProperties?.({
        merge: [
          {
            objectName,
            selector: null,
            properties: {
              [propertyName]: normalizedValue ?? value,
            },
          },
        ],
      });
    } catch (error) {
      console.error("persistProperties error:", error);
    }

    try {
      const currentObj = (this.settings as any)?.[objectName] ?? {};
      this.settings = {
        ...(this.settings as any),
        [objectName]: {
          ...currentObj,
          [propertyName]: value,
        },
      };
    } catch {
      // ignore
    }

    this.scheduleRebuildAndRender(false);
  }

  private applyPendingPropertyOverrides(settings: VisualSettings): VisualSettings {
    if (this.pendingPropertyOverrides.size === 0) {
      return settings;
    }

    const now = Date.now();
    let next: any = settings;
    for (const [key, pending] of Array.from(this.pendingPropertyOverrides.entries())) {
      if (pending.expiresAt <= now) {
        this.pendingPropertyOverrides.delete(key);
        continue;
      }

      const [objectName, propertyName] = key.split(".");
      if (!objectName || !propertyName) continue;
      const currentObj = next?.[objectName] ?? {};
      if (this.persistedValueMatches(objectName, propertyName, currentObj[propertyName], pending.value)) {
        this.pendingPropertyOverrides.delete(key);
        continue;
      }
      next = {
        ...next,
        [objectName]: {
          ...currentObj,
          [propertyName]: pending.value,
        },
      };
    }
    return next as VisualSettings;
  }

  public update(options: VisualUpdateOptions): void {
    this.renderingEvents.renderingStarted(options);

    try {
      this.allowInteractions = !!this.host.hostCapabilities?.allowInteractions;

      const palette: any = this.host.colorPalette as any;
      this.isHighContrast = !!palette?.isHighContrast;
      this.highContrastForeground = palette?.foreground?.value ?? "";
      this.highContrastBackground = palette?.background?.value ?? "";
      this.highContrastForegroundSelected = palette?.foregroundSelected?.value ?? "";
      this.highContrastHyperlink = palette?.hyperlink?.value ?? "";

      this.reactRoot.dataset.allowInteractions = String(this.allowInteractions);
      this.reactRoot.dataset.highContrast = String(this.isHighContrast);
      if (this.isHighContrast) {
        this.reactRoot.style.setProperty("--hc-foreground", this.highContrastForeground);
        this.reactRoot.style.setProperty("--hc-background", this.highContrastBackground);
        this.reactRoot.style.setProperty("--hc-foreground-selected", this.highContrastForegroundSelected);
        this.reactRoot.style.setProperty("--hc-hyperlink", this.highContrastHyperlink);
      } else {
        this.reactRoot.style.removeProperty("--hc-foreground");
        this.reactRoot.style.removeProperty("--hc-background");
        this.reactRoot.style.removeProperty("--hc-foreground-selected");
        this.reactRoot.style.removeProperty("--hc-hyperlink");
      }

      const dataView = options.dataViews?.[0];
      const objects = dataView?.metadata?.objects;
      this.lastDataView = dataView;
      this.lastViewport = { width: options.viewport.width, height: options.viewport.height };
      const moreDataRequested = this.requestMoreDataIfSegmented(dataView);
      this.settings = this.applyPendingPropertyOverrides(parseSettings(dataView));

      if (this.rowExpandedState.size === 0 && this.columnExpandedState.size === 0) {
        this.restoreExpansionStateFromSettings();
      }

      // Apply theme tokens based on selected preset
      const themeTokens = getThemePreset(this.settings.theme.preset as ThemePresetId);
      applyThemeTokensToElement(this.reactRoot, themeTokens);

      const isExplicit = (obj: string, prop: string) => objects && (objects as any)[obj] && (objects as any)[obj][prop] !== undefined;

      // Apply density-based row height
      const rowHeight = this.settings.theme.density === "compact"
        ? themeTokens.rowHeightCompact
        : themeTokens.rowHeightComfortable;
      this.reactRoot.style.setProperty("--mx-row-height", `${rowHeight}px`);

      // Explicit Color Overrides from Format Pane - ensuring they stick regardless of defaults
      if (this.settings.theme.customAccentColor && isExplicit("theme", "customAccentColor")) {
        const rgb = this.tryHexToRgb(this.settings.theme.customAccentColor);
        if (rgb) {
          this.reactRoot.style.setProperty("--mx-accent", this.settings.theme.customAccentColor);
          this.reactRoot.style.setProperty("--mx-accent-12", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`);
          this.reactRoot.style.setProperty("--mx-accent-10", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.10)`);
          this.reactRoot.style.setProperty("--mx-accent-55", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`);
        }
      }

      if (isExplicit("appearance", "accentColor")) {
        const rgb = this.tryHexToRgb(this.settings.appearance.accentColor);
        this.reactRoot.style.setProperty("--mx-accent", this.settings.appearance.accentColor);
        if (rgb) {
          this.reactRoot.style.setProperty("--mx-accent-12", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`);
          this.reactRoot.style.setProperty("--mx-accent-10", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.10)`);
          this.reactRoot.style.setProperty("--mx-accent-55", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`);
        }
      }

      if (isExplicit("appearance", "surfaceColor")) {
        this.reactRoot.style.setProperty("--mx-surface", this.settings.appearance.surfaceColor);
        this.reactRoot.style.setProperty("--mx-panel-bg", this.settings.appearance.surfaceColor);
        this.reactRoot.style.setProperty("--mx-cell-bg", this.settings.appearance.surfaceColor);
      }
      if (isExplicit("appearance", "toolbarBackgroundColor")) {
        this.reactRoot.style.setProperty("--mx-toolbar-bg", this.settings.appearance.toolbarBackgroundColor);
        this.reactRoot.style.setProperty("--mx-header-bg", this.settings.appearance.toolbarBackgroundColor);
      }
      if (isExplicit("appearance", "borderColor")) {
        this.reactRoot.style.setProperty("--mx-border", this.settings.appearance.borderColor);
        this.reactRoot.style.setProperty("--mx-panel-border", this.settings.appearance.borderColor);
      }
      if (isExplicit("appearance", "cornerRadius")) {
        this.reactRoot.style.setProperty("--mx-radius", `${this.settings.appearance.cornerRadius}px`);
      }

      if (isExplicit("headers", "backgroundColor")) {
        this.reactRoot.style.setProperty("--mx-header-bg", this.settings.headers.backgroundColor);
      }
      if (isExplicit("headers", "textColor")) {
        this.reactRoot.style.setProperty("--mx-header-fg", this.settings.headers.textColor);
      }
      if (isExplicit("values", "textColor")) {
        this.reactRoot.style.setProperty("--mx-cell-fg", this.settings.values.textColor);
        this.reactRoot.style.setProperty("--mx-text", this.settings.values.textColor);
      }
      if (isExplicit("values", "backgroundColor")) {
        this.reactRoot.style.setProperty("--mx-cell-bg", this.settings.values.backgroundColor);
      }
      if (isExplicit("totals", "backgroundColor")) {
        this.reactRoot.style.setProperty("--mx-total-bg", this.settings.totals.backgroundColor);
        this.reactRoot.style.setProperty("--mx-subtotal-bg", this.settings.totals.backgroundColor);
        this.reactRoot.style.setProperty("--mx-grandtotal-bg", this.settings.totals.backgroundColor);
      }
      if (isExplicit("totals", "textColor")) {
        this.reactRoot.style.setProperty("--mx-total-fg", this.settings.totals.textColor);
      }
      if (isExplicit("conditionalFormatting", "lowColor")) {
        this.reactRoot.style.setProperty("--mx-cond-low", this.settings.conditionalFormatting.lowColor);
      }
      if (isExplicit("conditionalFormatting", "midColor")) {
        this.reactRoot.style.setProperty("--mx-cond-mid", this.settings.conditionalFormatting.midColor);
      }
      if (isExplicit("conditionalFormatting", "highColor")) {
        this.reactRoot.style.setProperty("--mx-cond-high", this.settings.conditionalFormatting.highColor);
      }
      if (isExplicit("dataBars", "positiveColor")) {
        this.reactRoot.style.setProperty("--mx-databar-pos", this.settings.dataBars.positiveColor);
      }
      if (isExplicit("dataBars", "negativeColor")) {
        this.reactRoot.style.setProperty("--mx-databar-neg", this.settings.dataBars.negativeColor);
      }

      // While the host streams further segments, each update carries every row
      // received so far. Re-pivoting all of it per segment made large loads
      // quadratic; render the first segment, then wait for the final one.
      if (moreDataRequested && this.loadingSegments && this.model?.hasData) {
        this.renderingEvents.renderingFinished(options);
        return;
      }
      this.loadingSegments = moreDataRequested;

      const buildMs = this.ensureModel(dataView, false);

      debugMatrixData(dataView, this.model, buildMs);

      const width = options.viewport.width;
      const height = options.viewport.height;

      this.render(width, height);

      this.renderingEvents.renderingFinished(options);
    } catch (error) {
      console.error("Visual update error:", error);
      this.renderingEvents.renderingFailed(options, String(error));
    }
  }

  // \"identity\" type is relaxed to any to avoid tight coupling to SDK-specific types
  private buildSelectionId(matrixNode: any, levels: powerbi.DataViewHierarchyLevel[] = []): any | undefined {
    if (!matrixNode || !matrixNode.identity) return undefined;
    try {
      return this.host.createSelectionIdBuilder()
        .withMatrixNode(matrixNode as powerbi.DataViewMatrixNode, levels)
        .createSelectionId();
    } catch {
      return undefined;
    }
  }

  private render(width: number, height: number): void {
    const element = React.createElement(App, {
      model: this.model,
      settings: this.settings,
      selectionManager: this.selectionManager,
      tooltipService: this.tooltipServiceWrapper,
      allowInteractions: this.allowInteractions,
      isHighContrast: this.isHighContrast,
      highContrastColors: {
        foreground: this.highContrastForeground,
        background: this.highContrastBackground,
        foregroundSelected: this.highContrastForegroundSelected,
        hyperlink: this.highContrastHyperlink,
      },
      width,
      height,
      onPersistProperty: this.persistProperty.bind(this),
      onToggleRowExpand: this.handleToggleRowExpand.bind(this),
      onToggleColumnExpand: this.handleToggleColumnExpand.bind(this),
      onResetRowExpansion: this.handleResetRowExpansion.bind(this),
      onResetColumnExpansion: this.handleResetColumnExpansion.bind(this),
      onDrillRowToLevel: this.handleDrillRowToLevel.bind(this),
      onDrillColumnToLevel: this.handleDrillColumnToLevel.bind(this),
      onExpandAllUnder: this.handleExpandAllUnder.bind(this),
      onCollapseAllUnder: this.handleCollapseAllUnder.bind(this),
      downloadService: this.host.downloadService,
      isLoadingMoreData: this.loadingSegments,
    });

    // A rendering error shows a recoverable message instead of a blank visual,
    // and clears automatically once a new model (new data) arrives.
    const guarded = React.createElement(
      MatrixErrorBoundary,
      { resetKey: this.model, onReset: () => this.scheduleRebuildAndRender(true), children: element }
    );
    ReactDOM.render(guarded, this.reactRoot);
  }

  /** Serialize expansion state to JSON string[] and persist to manualData. */
  private persistExpansionState(): void {
    // Only persist the keys that are explicitly collapsed (false). Default is expanded.
    const collapsedRowKeys = Array.from(this.rowExpandedState.entries())
      .filter(([, v]) => v === false)
      .map(([k]) => k);
    const collapsedColKeys = Array.from(this.columnExpandedState.entries())
      .filter(([, v]) => v === false)
      .map(([k]) => k);
    this.persistProperty("manualData", "expandedRows", JSON.stringify(collapsedRowKeys));
    this.persistProperty("manualData", "expandedCols", JSON.stringify(collapsedColKeys));
  }

  /** Restore expansion state from settings (called once during update). */
  private restoreExpansionStateFromSettings(): void {
    try {
      const collapsedRowKeys: string[] = JSON.parse(this.settings.manualData.expandedRows || "[]");
      const collapsedColKeys: string[] = JSON.parse(this.settings.manualData.expandedCols || "[]");
      // If nothing is stored, leave the current in-memory state intact
      if (collapsedRowKeys.length === 0 && collapsedColKeys.length === 0) return;
      const newRowState = new Map<string, boolean>();
      for (const k of collapsedRowKeys) newRowState.set(k, false);
      this.rowExpandedState = newRowState;
      const newColState = new Map<string, boolean>();
      for (const k of collapsedColKeys) newColState.set(k, false);
      this.columnExpandedState = newColState;
    } catch {
      // ignore parse errors — leave current state
    }
  }

  private handleToggleRowExpand(nodeKey: string): void {
    const modelRow = this.model?.flattenedRows?.find(row => row.key === nodeKey);
    const currentState = this.rowExpandedState.get(nodeKey) ?? modelRow?.isExpanded ?? true;
    this.rowExpandedState = toggleNodeExpansion(this.rowExpandedState, nodeKey, currentState);
    this.persistExpansionState();
    this.scheduleRebuildAndRender();
  }

  private handleToggleColumnExpand(nodeKey: string): void {
    const currentState = this.columnExpandedState.get(nodeKey) ?? true;
    this.columnExpandedState = toggleNodeExpansion(this.columnExpandedState, nodeKey, currentState);
    this.persistExpansionState();
    this.scheduleRebuildAndRender();
  }

  private handleResetRowExpansion(): void {
    this.rowExpandedState = new Map();
    this.persistExpansionState();
    this.scheduleRebuildAndRender();
  }

  private handleResetColumnExpansion(): void {
    this.columnExpandedState = new Map();
    this.persistExpansionState();
    this.scheduleRebuildAndRender();
  }

  private handleDrillRowToLevel(level: number): void {
    const newState = new Map<string, boolean>();
    const setExpansionForLevel = (node: any, currentLevel: number) => {
      if (!node || !node.children) return;
      for (const child of node.children) {
        if (child.key) {
          newState.set(child.key, currentLevel < level);
        }
        setExpansionForLevel(child, currentLevel + 1);
      }
    };
    if (this.model.rowTree) {
      setExpansionForLevel(this.model.rowTree, 0);
    }
    this.rowExpandedState = newState;
    this.persistExpansionState();
    this.scheduleRebuildAndRender();
  }

  private handleDrillColumnToLevel(level: number): void {
    const newState = new Map<string, boolean>();
    const setExpansionForLevel = (node: any, currentLevel: number) => {
      if (!node || !node.children) return;
      for (const child of node.children) {
        if (child.key) {
          newState.set(child.key, currentLevel < level);
        }
        setExpansionForLevel(child, currentLevel + 1);
      }
    };
    if (this.model.columnTree) {
      setExpansionForLevel(this.model.columnTree, 0);
    }
    this.columnExpandedState = newState;
    this.persistExpansionState();
    this.scheduleRebuildAndRender();
  }

  private handleExpandAllUnder(nodeKey: string): void {
    this.rowExpandedState = new Map(this.rowExpandedState);
    const searchAndExpand = (node: any) => {
      if (!node) return;
      if (node.key === nodeKey || nodeKey === "root") {
        this.expandRecursive(node);
        return;
      }
      if (node.children) {
        for (const child of node.children) searchAndExpand(child);
      }
    };
    searchAndExpand(this.model.rowTree);
    this.persistExpansionState();
    this.scheduleRebuildAndRender();
  }

  private handleCollapseAllUnder(nodeKey: string): void {
    this.rowExpandedState = new Map(this.rowExpandedState);
    const searchAndCollapse = (node: any) => {
      if (!node) return;
      if (node.key === nodeKey) {
        this.collapseRecursive(node);
        return;
      }
      if (node.children) {
        for (const child of node.children) searchAndCollapse(child);
      }
    };
    searchAndCollapse(this.model.rowTree);
    this.persistExpansionState();
    this.scheduleRebuildAndRender();
  }

  private expandRecursive(node: any): void {
    if (node.key) this.rowExpandedState.set(node.key, true);
    if (node.children) {
      for (const child of node.children) this.expandRecursive(child);
    }
  }

  private collapseRecursive(node: any): void {
    if (node.key) this.rowExpandedState.set(node.key, false);
    if (node.children) {
      for (const child of node.children) this.collapseRecursive(child);
    }
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return getFormattingModel(this.settings);
  }

  public destroy(): void {
    ReactDOM.unmountComponentAtNode(this.reactRoot);
  }
}
