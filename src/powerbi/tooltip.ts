import powerbi from "powerbi-visuals-api";
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

export interface TooltipData {
  rowPath: string[];
  columnPath: string[];
  measureName: string;
  rawValue: number | null;
  formattedValue: string;
}

export class TooltipServiceWrapper {
  private tooltipService: ITooltipService;
  private element: HTMLElement | null = null;
  private identities: any[] = [];

  constructor(tooltipService: ITooltipService) {
    this.tooltipService = tooltipService;
  }

  setElement(element: HTMLElement): void {
    this.element = element;
  }

  show(data: TooltipData, coordinates: { x: number; y: number }, identities: any[] = []): void {
    if (!this.element) return;

    this.identities = identities;

    const tooltipDataItems: VisualTooltipDataItem[] = [];

    if (data.rowPath.length > 0) {
      tooltipDataItems.push({
        displayName: "Row",
        value: data.rowPath.join(" > "),
      });
    }

    if (data.columnPath.length > 0) {
      tooltipDataItems.push({
        displayName: "Column",
        value: data.columnPath.join(" > "),
      });
    }

    tooltipDataItems.push({
      displayName: data.measureName,
      value: data.formattedValue,
    });

    this.tooltipService.show({
      coordinates: [coordinates.x, coordinates.y],
      isTouchEvent: false,
      dataItems: tooltipDataItems,
      identities: this.identities,
    });
  }

  hide(): void {
    this.tooltipService.hide({
      immediately: true,
      isTouchEvent: false,
    });
  }

  move(coordinates: { x: number; y: number }): void {
    this.tooltipService.move({
      coordinates: [coordinates.x, coordinates.y],
      isTouchEvent: false,
      identities: this.identities,
    });
  }
}

export function createTooltipData(
  rowPath: string[],
  columnPath: string[],
  measureName: string,
  rawValue: number | null,
  formattedValue: string
): TooltipData {
  return {
    rowPath,
    columnPath,
    measureName,
    rawValue,
    formattedValue,
  };
}

export function formatTooltipValue(value: number | null, format?: string): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  if (format) {
    if (format.includes("%")) {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (format.includes("$")) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  return value.toLocaleString();
}
