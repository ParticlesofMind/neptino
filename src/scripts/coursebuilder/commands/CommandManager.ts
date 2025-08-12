import { Command } from './Command';

/**
 * Manages the execution, undoing, and redoing of commands.
 */
export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  /**
   * Executes a command and adds it to the undo stack.
   * @param command The command to execute.
   */
  public executeCommand(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    // When a new command is executed, the redo stack must be cleared.
    this.redoStack = [];
    console.log(`Command executed, undo stack size: ${this.undoStack.length}`);
  }

  /**
   * Undoes the most recent command.
   */
  public undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
      console.log(`Command undone, undo stack size: ${this.undoStack.length}, redo stack size: ${this.redoStack.length}`);
    } else {
      console.log('Nothing to undo.');
    }
  }

  /**
   * Redoes the most recently undone command.
   */
  public redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
      console.log(`Command redone, undo stack size: ${this.undoStack.length}, redo stack size: ${this.redoStack.length}`);
    } else {
      console.log('Nothing to redo.');
    }
  }

  /**
   * Checks if there is anything to undo.
   * @returns True if the undo stack is not empty, false otherwise.
   */
  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Checks if there is anything to redo.
   * @returns True if the redo stack is not empty, false otherwise.
   */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
