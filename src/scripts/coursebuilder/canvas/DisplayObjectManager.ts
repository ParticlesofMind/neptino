import { Container, DisplayObject } from "pixi.js";

/**
 * Display Object Manager
 * Centralizes adding and removing of display objects on the drawing layer
 */
export class DisplayObjectManager {
  private root: Container;
  private objects: Set<DisplayObject> = new Set();

  constructor(root: Container) {
    this.root = root;
  }

  /**
   * Add a display object to the drawing layer and track it
   */
  public add(object: DisplayObject): void {
    if (object.parent !== this.root) {
      this.root.addChild(object);
    }
    this.objects.add(object);
  }

  /**
   * Remove a display object from the drawing layer
   */
  public remove(object: DisplayObject): void {
    if (object.parent === this.root) {
      this.root.removeChild(object);
    }
    this.objects.delete(object);
  }

  /**
   * Get the underlying root container
   */
  public getRoot(): Container {
    return this.root;
  }

  /**
   * Return all tracked display objects
   */
  public getObjects(): DisplayObject[] {
    return Array.from(this.objects);
  }

  /**
   * Remove and clear all tracked objects
   */
  public clear(): void {
    this.objects.forEach((obj) => {
      if (obj.parent === this.root) {
        this.root.removeChild(obj);
      }
    });
    this.objects.clear();
  }
}
