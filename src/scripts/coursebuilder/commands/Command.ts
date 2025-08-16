/**
 * Command Interface
 * Defines the structure for all commands in the application, enabling undo/redo functionality.
 */
export interface Command {
 /**
 * Executes the command's action.
 */
 execute(): void;

 /**
 * Reverts the command's action.
 */
 undo(): void;
}
