export interface DragState {
  isDragging: boolean;
  targetId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
}

export type DragSubscriber = (state: DragState) => void;

function createDefaultState(): DragState {
  return {
    isDragging: false,
    targetId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
  };
}

export class DragManager {
  private state: DragState;
  private subscribers: Set<DragSubscriber> = new Set();

  constructor() {
    this.state = createDefaultState();
  }

  /**
   * Begin a drag operation on the given target at the specified coordinates.
   */
  startDrag(targetId: string, x: number, y: number): void {
    this.state = {
      isDragging: true,
      targetId,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      deltaX: 0,
      deltaY: 0,
    };
    this.notify();
  }

  /**
   * Update the drag position. Recalculates currentX/Y and deltaX/Y
   * relative to the start position.
   */
  updateDrag(x: number, y: number): void {
    if (!this.state.isDragging) {
      return;
    }
    this.state = {
      ...this.state,
      currentX: x,
      currentY: y,
      deltaX: x - this.state.startX,
      deltaY: y - this.state.startY,
    };
    this.notify();
  }

  /**
   * End the current drag operation. Returns the final drag state
   * and resets internal state to defaults.
   */
  endDrag(): DragState {
    const finalState = { ...this.state };
    this.state = createDefaultState();
    this.notify();
    return finalState;
  }

  /**
   * Return a copy of the current drag state.
   */
  getState(): DragState {
    return { ...this.state };
  }

  /**
   * Whether a drag operation is currently in progress.
   */
  isDragging(): boolean {
    return this.state.isDragging;
  }

  /**
   * Register a subscriber that will be called on every drag state change.
   * Returns an unsubscribe function.
   */
  subscribe(fn: DragSubscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  /**
   * Notify all subscribers with a copy of the current state.
   */
  private notify(): void {
    const snapshot = this.getState();
    this.subscribers.forEach(fn => fn(snapshot));
  }
}
