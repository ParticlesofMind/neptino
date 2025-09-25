export type HistoryAction = {
  label?: string;
  undo: () => void;
  redo: () => void;
  timestamp?: number;
};

export type HistoryEventType = 'push' | 'undo' | 'redo' | 'clear' | 'limit-reached';

export interface HistoryEventListener {
  (event: {
    type: HistoryEventType;
    action?: HistoryAction;
    undoCount: number;
    redoCount: number;
  }): void;
}

export class HistoryManager {
  private static readonly MAX_HISTORY_SIZE = 30;
  
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private listeners: Set<HistoryEventListener> = new Set();

  /**
   * Add a new action to the history stack
   * Automatically enforces the maximum history limit of 30 actions
   */
  push(action: HistoryAction): void {
    // Add timestamp if not provided
    if (!action.timestamp) {
      action.timestamp = Date.now();
    }

    this.undoStack.push(action);
    this.redoStack.length = 0; // clear redo stack on new action

    // Enforce maximum history size - remove oldest actions if exceeded
    if (this.undoStack.length > HistoryManager.MAX_HISTORY_SIZE) {
      const removedActions = this.undoStack.splice(0, this.undoStack.length - HistoryManager.MAX_HISTORY_SIZE);
      this.notifyListeners('limit-reached', undefined);
      
      // Log when we hit the limit (for debugging)
      if ((window as any).__NEPTINO_DEBUG_LOGS) {
        console.log(`📚 History limit reached. Removed ${removedActions.length} oldest actions:`, 
          removedActions.map(a => a.label || 'Unnamed action').join(', '));
      }
    }

    this.notifyListeners('push', action);
  }

  /**
   * Check if undo is possible
   */
  canUndo(): boolean { 
    return this.undoStack.length > 0; 
  }

  /**
   * Check if redo is possible
   */
  canRedo(): boolean { 
    return this.redoStack.length > 0; 
  }

  /**
   * Undo the most recently performed action
   * Returns true if successful, false if no action to undo
   */
  undo(): boolean {
    const action = this.undoStack.pop();
    if (!action) return false;

    try {
      action.undo();
      this.redoStack.push(action);
      this.notifyListeners('undo', action);
      
      if ((window as any).__NEPTINO_DEBUG_LOGS) {
        console.log(`⬅️ Undid: ${action.label || 'Unnamed action'}`);
      }
      
      return true;
    } catch (error) {
      console.warn('History undo error:', error);
      // Re-add the action to undo stack if it failed
      this.undoStack.push(action);
      return false;
    }
  }

  /**
   * Redo the most recently undone action  
   * Returns true if successful, false if no action to redo
   */
  redo(): boolean {
    const action = this.redoStack.pop();
    if (!action) return false;

    try {
      action.redo();
      this.undoStack.push(action);
      this.notifyListeners('redo', action);
      
      if ((window as any).__NEPTINO_DEBUG_LOGS) {
        console.log(`➡️ Redid: ${action.label || 'Unnamed action'}`);
      }
      
      return true;
    } catch (error) {
      console.warn('History redo error:', error);
      // Re-add the action to redo stack if it failed
      this.redoStack.push(action);
      return false;
    }
  }

  /**
   * Clear all history
   */
  clear(): void { 
    this.undoStack.length = 0; 
    this.redoStack.length = 0; 
    this.notifyListeners('clear');
    
    if ((window as any).__NEPTINO_DEBUG_LOGS) {
      console.log('🗑️ History cleared');
    }
  }

  /**
   * Get current history statistics
   */
  getStats(): { undoCount: number; redoCount: number; maxSize: number } {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      maxSize: HistoryManager.MAX_HISTORY_SIZE
    };
  }

  /**
   * Get a preview of available undo actions (for UI display)
   */
  getUndoPreview(limit: number = 5): Array<{ label: string; timestamp?: number }> {
    return this.undoStack
      .slice(-limit)
      .reverse()
      .map(action => ({
        label: action.label || 'Unnamed action',
        timestamp: action.timestamp
      }));
  }

  /**
   * Get a preview of available redo actions (for UI display)
   */
  getRedoPreview(limit: number = 5): Array<{ label: string; timestamp?: number }> {
    return this.redoStack
      .slice(-limit)
      .reverse()
      .map(action => ({
        label: action.label || 'Unnamed action',
        timestamp: action.timestamp
      }));
  }

  /**
   * Add event listener for history changes
   */
  addEventListener(listener: HistoryEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: HistoryEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of history events
   */
  private notifyListeners(type: HistoryEventType, action?: HistoryAction): void {
    const event = {
      type,
      action,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.warn('History event listener error:', error);
      }
    });
  }
}

export const historyManager = new HistoryManager();

