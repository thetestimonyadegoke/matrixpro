/**
 * Drives the real Visual class to verify when the pivot model is rebuilt.
 * React rendering, the stylesheet import and the DOM are stubbed; model
 * building is the real implementation wrapped in a spy.
 */
jest.mock("../../style/visual.less", () => ({}));
jest.mock("react-dom", () => ({ render: jest.fn(), unmountComponentAtNode: jest.fn() }));
jest.mock("../ui/App", () => ({ App: (): null => null }));
jest.mock("../model/pivot", () => {
  const actual = jest.requireActual("../model/pivot");
  return { ...actual, buildMatrixModel: jest.fn(actual.buildMatrixModel) };
});

import * as ReactDOM from "react-dom";
import { buildMatrixModel } from "../model/pivot";
import { Visual } from "../visual";
import { createMatrixDataView } from "./fixtures/matrixDataView";
import { createMockVisualHost } from "./testUtils";

const buildSpy = buildMatrixModel as jest.Mock;
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

function createVisual(fetchMoreData: () => boolean = () => false) {
  const host = {
    ...createMockVisualHost(),
    eventService: { renderingStarted: jest.fn(), renderingFinished: jest.fn(), renderingFailed: jest.fn() },
    hostCapabilities: { allowInteractions: true },
    colorPalette: {},
    persistProperties: jest.fn(),
    fetchMoreData: jest.fn(fetchMoreData),
    createSelectionIdBuilder: () => ({ withMatrixNode: () => ({ createSelectionId: () => ({}) }) }),
  };
  const visual = new Visual({ element: fakeElement(), host } as any);
  return { visual, host };
}

const RESIZE = 1 << 2;
const DATA = 1 << 1;
const update = (visual: Visual, dataView: any, type = DATA, width = 800) =>
  visual.update({ dataViews: [dataView], viewport: { width, height: 600 }, type } as any);

const smallDataView = () => createMatrixDataView({ categories: 2, productsPerCategory: 2, years: 1, monthsPerYear: 2, measures: 1 });

beforeEach(() => {
  buildSpy.mockClear();
  renderSpy.mockClear();
  rafQueue.length = 0;
});

describe("Visual model reuse", () => {
  it("builds once and reuses the model for resize-only updates", () => {
    const { visual } = createVisual();
    const dataView = smallDataView();
    update(visual, dataView);
    update(visual, dataView, RESIZE, 900);
    update(visual, dataView, RESIZE, 1000);
    expect(buildSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).toHaveBeenCalledTimes(3);
  });

  it("rebuilds when new data arrives", () => {
    const { visual } = createVisual();
    update(visual, smallDataView());
    update(visual, smallDataView());
    expect(buildSpy).toHaveBeenCalledTimes(2);
  });

  it("rebuilds when a model-affecting setting changes in the dataView objects", () => {
    const { visual } = createVisual();
    const dataView = smallDataView();
    update(visual, dataView);
    const withSubtotalsOff = { ...dataView, metadata: { ...dataView.metadata, objects: { totals: { showRowSubtotals: false } } } };
    update(visual, withSubtotalsOff);
    expect(buildSpy).toHaveBeenCalledTimes(2);
  });

  it("does not rebuild for a cosmetic persisted property, but still re-renders", () => {
    const { visual, host } = createVisual();
    update(visual, smallDataView());
    renderSpy.mockClear();
    (visual as any).persistProperty("headers", "backgroundColor", "#ff0000");
    flushFrames();
    expect(host.persistProperties).toHaveBeenCalled();
    expect(buildSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it("rebuilds for a structural persisted property", () => {
    const { visual } = createVisual();
    update(visual, smallDataView());
    (visual as any).persistProperty("totals", "showRowSubtotals", false);
    flushFrames();
    expect(buildSpy).toHaveBeenCalledTimes(2);
  });

  it("always rebuilds on expand/collapse", () => {
    const { visual } = createVisual();
    update(visual, smallDataView());
    const parent = (visual as any).model.flattenedRows.find((r: any) => r.hasChildren);
    (visual as any).handleToggleRowExpand(parent.key);
    flushFrames();
    expect(buildSpy).toHaveBeenCalledTimes(2);
    expect((visual as any).model.flattenedRows.find((r: any) => r.key === parent.key).isExpanded).toBe(false);
  });

  it("keeps a forced rebuild when a cosmetic change is already queued", () => {
    const { visual } = createVisual();
    update(visual, smallDataView());
    (visual as any).persistProperty("headers", "textColor", "#123456");
    const parent = (visual as any).model.flattenedRows.find((r: any) => r.hasChildren);
    (visual as any).handleToggleRowExpand(parent.key);
    flushFrames();
    expect(buildSpy).toHaveBeenCalledTimes(2);
  });
});

describe("Visual segmented loading", () => {
  it("renders the first segment, skips intermediate ones and renders the final one", () => {
    let segmentsLeft = 2;
    const { visual, host } = createVisual(() => segmentsLeft > 0);
    const withSegment = () => {
      const dv = smallDataView();
      dv.metadata.segment = {};
      return dv;
    };
    update(visual, withSegment());
    segmentsLeft--;
    update(visual, withSegment());
    segmentsLeft--;
    update(visual, smallDataView());
    expect(host.fetchMoreData).toHaveBeenCalledTimes(2);
    expect(buildSpy).toHaveBeenCalledTimes(2);
    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(host.eventService.renderingFinished).toHaveBeenCalledTimes(3);
    const appProps = (call: any[]) => call[0].props.children.props;
    expect(appProps(renderSpy.mock.calls[0]).isLoadingMoreData).toBe(true);
    expect(appProps(renderSpy.mock.calls[1]).isLoadingMoreData).toBe(false);
  });

  it("renders normally when the host refuses more data", () => {
    const { visual } = createVisual(() => false);
    const dv = smallDataView();
    dv.metadata.segment = {};
    update(visual, dv);
    const dv2 = smallDataView();
    dv2.metadata.segment = {};
    update(visual, dv2);
    expect(buildSpy).toHaveBeenCalledTimes(2);
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});
