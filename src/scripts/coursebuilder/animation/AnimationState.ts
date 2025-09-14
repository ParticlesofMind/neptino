/**
 * AnimationState
 * Centralized, DRY animation state and helpers for animate mode
 */

import { Application, Container, Point } from 'pixi.js';
import { DisplayObjectManager } from '../canvas/DisplayObjectManager';
import { Scene } from './Scene';

export type PathSpeed = 'slow' | 'medium' | 'fast';

export class AnimationState {
  private app: Application | null = null;
  private uiLayer: Container | null = null;
  private displayManager: DisplayObjectManager | null = null;
  private scenes: Scene[] = [];
  private loopEnabled: boolean = false;
  private pathSpeed: PathSpeed = 'slow';

  init(opts: { app: Application; uiLayer: Container; displayManager: DisplayObjectManager | null }): void {
    this.app = opts.app;
    this.uiLayer = opts.uiLayer;
    this.displayManager = opts.displayManager;
  }

  getApp(): Application | null { return this.app; }
  getUiLayer(): Container | null { return this.uiLayer; }
  getDisplayManager(): DisplayObjectManager | null { return this.displayManager; }

  addScene(scene: Scene): void {
    // Enforce DRY: do not duplicate if same bounds reference exists
    if (!this.scenes.includes(scene)) {
      this.scenes.push(scene);
    }
  }

  getScenes(): Scene[] { return [...this.scenes]; }

  clearScenes(): void {
    this.scenes.forEach(s => s.destroy());
    this.scenes = [];
  }

  setLoop(enabled: boolean): void {
    this.loopEnabled = enabled;
    // Inform all scenes
    this.scenes.forEach(s => s.setLoop(enabled));
  }
  getLoop(): boolean { return this.loopEnabled; }

  setPathSpeed(speed: PathSpeed): void { this.pathSpeed = speed; }
  getPathSpeed(): PathSpeed { return this.pathSpeed; }

  /**
   * Find a scene that contains a point in canvas/drawing coordinates
   */
  findSceneAt(point: Point): Scene | null {
    for (let i = this.scenes.length - 1; i >= 0; i--) {
      const s = this.scenes[i];
      if (s.contains(point)) return s;
    }
    return null;
  }
}

// Singleton instance for simple integration
export const animationState = new AnimationState();

