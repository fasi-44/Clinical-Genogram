export type SelectionType = 'person' | 'relationship' | null;

export interface Selection {
  type: SelectionType;
  id: string | null;
}

export type SelectionSubscriber = (selection: Selection) => void;

export class SelectionManager {
  private selection: Selection = { type: null, id: null };
  private subscribers: Set<SelectionSubscriber> = new Set();

  /**
   * Set the current selection and notify all subscribers.
   */
  select(type: SelectionType, id: string): void {
    this.selection = { type, id };
    this.notify();
  }

  /**
   * Clear the current selection and notify all subscribers.
   */
  deselect(): void {
    this.selection = { type: null, id: null };
    this.notify();
  }

  /**
   * Return a copy of the current selection state.
   */
  getSelection(): Selection {
    return { ...this.selection };
  }

  /**
   * Check whether the given id is currently selected.
   */
  isSelected(id: string): boolean {
    return this.selection.id === id;
  }

  /**
   * Register a subscriber that will be called on every selection change.
   * Returns an unsubscribe function.
   */
  subscribe(fn: SelectionSubscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  /**
   * Notify all subscribers with a copy of the current selection.
   */
  private notify(): void {
    const snapshot = this.getSelection();
    this.subscribers.forEach(fn => fn(snapshot));
  }
}
