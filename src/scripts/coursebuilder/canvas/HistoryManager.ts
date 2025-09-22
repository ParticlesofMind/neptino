export type HistoryAction = {
  label?: string;
  undo: () => void;
  redo: () => void;
};

export class HistoryManager {
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];

  push(action: HistoryAction): void {
    this.undoStack.push(action);
    this.redoStack.length = 0; // clear redo on new action
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  undo(): boolean {
    const act = this.undoStack.pop();
    if (!act) return false;
    try { act.undo(); } catch (e) { console.warn('History undo error', e); }
    this.redoStack.push(act);
    return true;
  }

  redo(): boolean {
    const act = this.redoStack.pop();
    if (!act) return false;
    try { act.redo(); } catch (e) { console.warn('History redo error', e); }
    this.undoStack.push(act);
    return true;
  }

  clear(): void { this.undoStack.length = 0; this.redoStack.length = 0; }
}

export const historyManager = new HistoryManager();

