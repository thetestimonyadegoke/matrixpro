import { ViewportRange, computeVisibleRange, ViewportConfig } from "./viewport";

export interface ScrollState {
  scrollTop: number;
  scrollLeft: number;
  isScrolling: boolean;
  lastScrollTime: number;
}

export function createScrollState(): ScrollState {
  return {
    scrollTop: 0,
    scrollLeft: 0,
    isScrolling: false,
    lastScrollTime: 0,
  };
}

export type ScrollHandler = (scrollTop: number, scrollLeft: number) => void;

export class ScrollManager {
  private rafId: number | null = null;
  private pendingScrollTop: number = 0;
  private pendingScrollLeft: number = 0;
  private hasPendingUpdate: boolean = false;
  private onScroll: ScrollHandler;
  private scrollEndTimeout: ReturnType<typeof setTimeout> | null = null;
  private onScrollEnd?: () => void;

  constructor(onScroll: ScrollHandler, onScrollEnd?: () => void) {
    this.onScroll = onScroll;
    this.onScrollEnd = onScrollEnd;
  }

  handleScroll(scrollTop: number, scrollLeft: number): void {
    this.pendingScrollTop = scrollTop;
    this.pendingScrollLeft = scrollLeft;

    if (!this.hasPendingUpdate) {
      this.hasPendingUpdate = true;
      this.rafId = requestAnimationFrame(() => this.processScroll());
    }

    if (this.scrollEndTimeout) {
      clearTimeout(this.scrollEndTimeout);
    }
    this.scrollEndTimeout = setTimeout(() => {
      this.onScrollEnd?.();
    }, 150);
  }

  private processScroll(): void {
    this.hasPendingUpdate = false;
    this.onScroll(this.pendingScrollTop, this.pendingScrollLeft);
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.scrollEndTimeout) {
      clearTimeout(this.scrollEndTimeout);
    }
  }
}

export function shouldUpdateRange(
  oldRange: ViewportRange,
  newRange: ViewportRange,
  threshold: number = 0
): boolean {
  return (
    Math.abs(newRange.startRow - oldRange.startRow) > threshold ||
    Math.abs(newRange.endRow - oldRange.endRow) > threshold ||
    Math.abs(newRange.startCol - oldRange.startCol) > threshold ||
    Math.abs(newRange.endCol - oldRange.endCol) > threshold
  );
}

export function syncScroll(
  sourceElement: HTMLElement,
  targetElement: HTMLElement,
  direction: "horizontal" | "vertical" | "both"
): void {
  if (direction === "horizontal" || direction === "both") {
    targetElement.scrollLeft = sourceElement.scrollLeft;
  }
  if (direction === "vertical" || direction === "both") {
    targetElement.scrollTop = sourceElement.scrollTop;
  }
}

export interface VirtualScrollResult {
  visibleRange: ViewportRange;
  scrollState: ScrollState;
}

export function computeVirtualScroll(
  scrollTop: number,
  scrollLeft: number,
  config: ViewportConfig,
  prevState: ScrollState
): VirtualScrollResult {
  const visibleRange = computeVisibleRange(scrollTop, scrollLeft, config);
  const now = Date.now();

  return {
    visibleRange,
    scrollState: {
      scrollTop,
      scrollLeft,
      isScrolling: true,
      lastScrollTime: now,
    },
  };
}

export function getScrollbarWidth(): number {
  const outer = document.createElement("div");
  outer.style.visibility = "hidden";
  outer.style.overflow = "scroll";
  document.body.appendChild(outer);

  const inner = document.createElement("div");
  outer.appendChild(inner);

  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
  outer.parentNode?.removeChild(outer);

  return scrollbarWidth;
}
