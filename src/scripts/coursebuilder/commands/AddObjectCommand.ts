import { Command } from './Command';
import { Container, DisplayObject } from 'pixi.js';

/**
 * A command to add a DisplayObject to a PIXI.Container.
 */
export class AddObjectCommand implements Command {
  private readonly objectToAdd: DisplayObject;
  private readonly parentContainer: Container;

  /**
   * @param objectToAdd The PIXI.DisplayObject to be added to the canvas.
   * @param parentContainer The PIXI.Container to which the object will be added.
   */
  constructor(objectToAdd: DisplayObject, parentContainer: Container) {
    this.objectToAdd = objectToAdd;
    this.parentContainer = parentContainer;
  }

  /**
   * Executes the command, adding the object to the container.
   */
  public execute(): void {
    this.parentContainer.addChild(this.objectToAdd);
    console.log('AddObjectCommand: executed');
  }

  /**
   * Undoes the command, removing the object from the container.
   */
  public undo(): void {
    this.parentContainer.removeChild(this.objectToAdd);
    console.log('AddObjectCommand: undone');
  }
}
