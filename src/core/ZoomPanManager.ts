import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../utils/constants';

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export type ViewSubscriber = (state: ViewState) => void;

export class ZoomPanManager {
  private zoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private minZoom: number;
  private maxZoom: number;
  private subscribers: Set<ViewSubscriber> = new Set();

  constructor(minZoom: number = MIN_ZOOM, maxZoom: number = MAX_ZOOM) {
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
  }

  // ---------------------------------------------------------------------------
  // Zoom
  // ---------------------------------------------------------------------------

  /**
   * Increase zoom by ZOOM_STEP, clamped to maxZoom.
   */
  zoomIn(): void {
    this.zoomTo(this.zoom + ZOOM_STEP);
  }

  /**
   * Decrease zoom by ZOOM_STEP, clamped to minZoom.
   */
  zoomOut(): void {
    this.zoomTo(this.zoom - ZOOM_STEP);
  }

  /**
   * Set zoom to an exact level, clamped within [minZoom, maxZoom].
   */
  zoomTo(level: number): void {
    const clamped = Math.min(this.maxZoom, Math.max(this.minZoom, level));
    if (clamped === this.zoom) {
      return;
    }
    this.zoom = clamped;
    this.notify();
  }

  /**
   * Zoom to a given level while keeping the point at (screenX, screenY)
   * stationary on screen. This computes the world coordinate under the cursor
   * before and after the zoom change and adjusts the pan so the same world
   * point remains at the same screen position.
   */
  setZoomAroundPoint(level: number, screenX: number, screenY: number): void {
    const clamped = Math.min(this.maxZoom, Math.max(this.minZoom, level));
    if (clamped === this.zoom) {
      return;
    }

    // World coordinate under the cursor before zoom change.
    const worldX = (screenX - this.panX) / this.zoom;
    const worldY = (screenY - this.panY) / this.zoom;

    // Apply the new zoom.
    this.zoom = clamped;

    // Adjust pan so the same world point maps back to the same screen point.
    this.panX = screenX - worldX * this.zoom;
    this.panY = screenY - worldY * this.zoom;

    this.notify();
  }

  /**
   * Return the current zoom level.
   */
  getZoom(): number {
    return this.zoom;
  }

  // ---------------------------------------------------------------------------
  // Pan
  // ---------------------------------------------------------------------------

  /**
   * Add a relative offset to the current pan position.
   */
  pan(deltaX: number, deltaY: number): void {
    this.panX += deltaX;
    this.panY += deltaY;
    this.notify();
  }

  /**
   * Set the pan position to absolute coordinates.
   */
  panTo(x: number, y: number): void {
    this.panX = x;
    this.panY = y;
    this.notify();
  }

  /**
   * Return the current pan position.
   */
  getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }

  // ---------------------------------------------------------------------------
  // View state
  // ---------------------------------------------------------------------------

  /**
   * Return a snapshot of the full view state (zoom + pan).
   */
  getViewState(): ViewState {
    return {
      zoom: this.zoom,
      panX: this.panX,
      panY: this.panY,
    };
  }

  // ---------------------------------------------------------------------------
  // Coordinate conversion
  // ---------------------------------------------------------------------------

  /**
   * Convert screen pixel coordinates to world coordinates.
   * worldX = (screenX - panX) / zoom
   * worldY = (screenY - panY) / zoom
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.panX) / this.zoom,
      y: (screenY - this.panY) / this.zoom,
    };
  }

  /**
   * Convert world coordinates to screen pixel coordinates.
   * screenX = worldX * zoom + panX
   * screenY = worldY * zoom + panY
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.zoom + this.panX,
      y: worldY * this.zoom + this.panY,
    };
  }

  // ---------------------------------------------------------------------------
  // Fit to view
  // ---------------------------------------------------------------------------

  /**
   * Adjust zoom and pan so that the given world-space bounding box fits
   * within the viewport. An optional padding (in screen pixels) is applied
   * on each side. Content is centered within the viewport.
   */
  fitToView(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    viewportWidth: number,
    viewportHeight: number,
    padding: number = 40,
    maxFitZoom: number = this.maxZoom,
  ): void {
    const boundsWidth = bounds.maxX - bounds.minX;
    const boundsHeight = bounds.maxY - bounds.minY;

    // Avoid division by zero for degenerate bounds.
    if (boundsWidth <= 0 || boundsHeight <= 0) {
      this.zoom = 1;
      this.panX = viewportWidth / 2;
      this.panY = viewportHeight / 2;
      this.notify();
      return;
    }

    const availableWidth = viewportWidth - padding * 2;
    const availableHeight = viewportHeight - padding * 2;

    // Pick the zoom that makes the content fit in both dimensions.
    const scaleX = availableWidth / boundsWidth;
    const scaleY = availableHeight / boundsHeight;
    const newZoom = Math.min(this.maxZoom, maxFitZoom, Math.max(this.minZoom, Math.min(scaleX, scaleY)));

    // Center of the bounds in world space.
    const centerWorldX = (bounds.minX + bounds.maxX) / 2;
    const centerWorldY = (bounds.minY + bounds.maxY) / 2;

    // Pan so that the world center maps to the viewport center.
    // screenX = worldX * zoom + panX  =>  panX = screenCenterX - worldCenterX * zoom
    this.zoom = newZoom;
    this.panX = viewportWidth / 2 - centerWorldX * this.zoom;
    this.panY = viewportHeight / 2 - centerWorldY * this.zoom;

    this.notify();
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  /**
   * Reset zoom to 1 and pan to (0, 0).
   */
  reset(): void {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.notify();
  }

  // ---------------------------------------------------------------------------
  // Subscribers
  // ---------------------------------------------------------------------------

  /**
   * Register a subscriber that will be called on every view state change.
   * Returns an unsubscribe function.
   */
  subscribe(fn: ViewSubscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  /**
   * Notify all subscribers with a snapshot of the current view state.
   */
  private notify(): void {
    const snapshot = this.getViewState();
    this.subscribers.forEach(fn => fn(snapshot));
  }
}
