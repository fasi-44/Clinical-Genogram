import { HISTORY_LIMIT } from '../utils/constants';

export class HistoryManager<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  private limit: number;

  constructor(limit: number = HISTORY_LIMIT) {
    this.limit = limit;
  }

  push(state: T): void {
    const cloned = structuredClone(state);
    this.undoStack.push(cloned);

    // Clear redo stack on new action
    this.redoStack = [];

    // Enforce limit
    if (this.undoStack.length > this.limit) {
      this.undoStack.splice(0, this.undoStack.length - this.limit);
    }
  }

  undo(currentState: T): T | null {
    if (!this.canUndo()) {
      return null;
    }

    // Push current state onto redo stack
    this.redoStack.push(structuredClone(currentState));

    // Pop and return the previous state from undo stack
    return this.undoStack.pop()!;
  }

  redo(currentState: T): T | null {
    if (!this.canRedo()) {
      return null;
    }

    // Push current state onto undo stack
    this.undoStack.push(structuredClone(currentState));

    // Pop and return the next state from redo stack
    return this.redoStack.pop()!;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
