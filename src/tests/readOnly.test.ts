/**
 * Read-only mode: who counts as a reader, and what a reader may still change.
 * Drives the real Visual class with React, the stylesheet and the DOM stubbed.
 */
jest.mock("../../style/visual.less", () => ({}));
jest.mock("react-dom", () => ({ render: jest.fn(), unmountComponentAtNode: jest.fn() }));
jest.mock("../ui/App", () => ({ App: (): null => null }));

import * as ReactDOM from "react-dom";
import { Visual } from "../visual";
import { createMatrixDataView } from "./fixtures/matrixDataView";
import { createMockVisualHost } from "./testUtils";

const renderSpy = ReactDOM.render as jest.Mock;

function fakeElement(): any {
  return {
    style: { setProperty: jest.fn(), removeProperty: jest.fn() },
    dataset: {},
    className: "",
    setAttribute: jest.fn(),
    appendChild: jest.fn(),
    clientWidth: 800,
    clientHeight: 600,
  };
}

const rafQueue: Array<() => void> = [];
beforeAll(() => {
  (global as any).document = { createElement: () => fakeElement() };
  (global as any).requestAnimationFrame = (cb: () => void) => { rafQueue.push(cb); return rafQueue.length; };
});
const flushFrames = () => { while (rafQueue.length) rafQueue.shift()!(); };

const READING_VIEW = 0;
const EDITING_VIEW = 1;

function setup(viewMode: number | undefined, viewing?: { mode?: string; readOnlyToolbar?: string }) {
  const host = {
    ...createMockVisualHost(),
    eventService: { renderingStarted: jest.fn(), renderingFinished: jest.fn(), renderingFailed: jest.fn() },
    hostCapabilities: { allowInteractions: true },
    colorPalette: {},
    persistProperties: jest.fn(),
    fetchMoreData: jest.fn(() => false),
    createSelectionIdBuilder: () => ({ withMatrixNode: () => ({ createSelectionId: () => ({}) }) }),
  };
  const visual = new Visual({ element: fakeElement(), host } as any);
  const dataView: any = createMatrixDataView({ categories: 2, productsPerCategory: 2, years: 1, monthsPerYear: 2, measures: 1 });
  dataView.metadata.objects = viewing ? { viewing } : {};
  renderSpy.mockClear();
  visual.update({ dataViews: [dataView], viewport: { width: 800, height: 600 }, type: 2, viewMode } as any);
  flushFrames();
  return { visual: visual as any, host };
}

/** The readOnly prop the last render handed to the App (it sits inside the error boundary element). */
const renderedReadOnly = () => {
  const calls = renderSpy.mock.calls;
  const boundary = calls[calls.length - 1][0];
  return boundary.props.children.props.readOnly;
};

describe("who is read-only", () => {
  it("treats Power BI's reading view as read-only and editing views as editable", () => {
    setup(READING_VIEW);
    expect(renderedReadOnly()).toBe(true);
    setup(EDITING_VIEW);
    expect(renderedReadOnly()).toBe(false);
    setup(2); // focus-mode editing
    expect(renderedReadOnly()).toBe(false);
  });

  it("stays editable where the host reports no view mode (the dev server)", () => {
    setup(undefined);
    expect(renderedReadOnly()).toBe(false);
  });

  it("lets the Mode setting override the view mode either way", () => {
    setup(EDITING_VIEW, { mode: "readOnly" });
    expect(renderedReadOnly()).toBe(true);
    setup(READING_VIEW, { mode: "edit" });
    expect(renderedReadOnly()).toBe(false);
    setup(READING_VIEW, { mode: "auto" });
    expect(renderedReadOnly()).toBe(true);
  });
});

describe("what a reader may change", () => {
  it("refuses changes to the report while read-only", () => {
    const { visual, host } = setup(READING_VIEW);
    visual.persistProperty("manualData", "edits", JSON.stringify({ a: "1" }));
    visual.persistProperty("headers", "colHeaderLevel0Bg", "#ff0000");
    visual.persistProperty("theme", "preset", "modern-dark");
    visual.persistProperty("appearance", "showToolbar", false);
    visual.persistProperty("viewing", "mode", "edit");
    expect(host.persistProperties).not.toHaveBeenCalled();
    expect(visual.settings.theme.preset).not.toBe("modern-dark");
    expect(visual.settings.viewing.mode).toBe("auto");
  });

  it("lets a reader sort and filter for the session without writing to the report", () => {
    const { visual, host } = setup(READING_VIEW);
    const rules = JSON.stringify([{ measureIndex: 0, direction: "desc", priority: 0 }]);
    visual.persistProperty("manualData", "sortRules", rules);
    visual.persistProperty("manualData", "filterRules", "[]");
    visual.persistProperty("manualData", "expandedRows", "[]");
    expect(host.persistProperties).not.toHaveBeenCalled();
    expect(visual.settings.manualData.sortRules).toBe(rules);
  });

  it("keeps a reader's session choices across the next data update", () => {
    const { visual } = setup(READING_VIEW);
    const rules = JSON.stringify([{ measureIndex: 0, direction: "asc", priority: 0 }]);
    visual.persistProperty("manualData", "sortRules", rules);
    const dataView: any = createMatrixDataView({ categories: 2, productsPerCategory: 2, years: 1, monthsPerYear: 2, measures: 1 });
    dataView.metadata.objects = {};
    visual.update({ dataViews: [dataView], viewport: { width: 800, height: 600 }, type: 2, viewMode: READING_VIEW } as any);
    expect(visual.settings.manualData.sortRules).toBe(rules);
  });

  it("still saves changes for authors", () => {
    const { visual, host } = setup(EDITING_VIEW);
    visual.persistProperty("theme", "density", "compact");
    expect(host.persistProperties).toHaveBeenCalledTimes(1);
  });
});
