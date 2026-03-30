import powerbi from "powerbi-visuals-api";
import IVisualEventService = powerbi.extensibility.IVisualEventService;

export class RenderingEventsManager {
  private eventService: IVisualEventService;
  private isRendering: boolean = false;

  constructor(eventService: IVisualEventService) {
    this.eventService = eventService;
  }

  renderingStarted(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    if (!this.isRendering) {
      this.isRendering = true;
      this.eventService.renderingStarted(options);
    }
  }

  renderingFinished(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
    if (this.isRendering) {
      this.isRendering = false;
      this.eventService.renderingFinished(options);
    }
  }

  renderingFailed(
    options: powerbi.extensibility.visual.VisualUpdateOptions,
    reason?: string
  ): void {
    if (this.isRendering) {
      this.isRendering = false;
      this.eventService.renderingFailed(options, reason);
    }
  }
}
