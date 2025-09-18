/**
 * AnimationState
 * Centralized, DRY animation state and helpers for animate mode
 */

import { Application, Container, Point } from 'pixi.js';
import { DisplayObjectManager } from '../canvas/DisplayObjectManager';
import { Scene } from './Scene';

export type PathEase = 'linear' | 'easeIn' | 'easeOut';

export class AnimationState {
  private app: Application | null = null;
  private uiLayer: Container | null = null;
  private displayManager: DisplayObjectManager | null = null;
  private scenes: Scene[] = [];
  private loopEnabled: boolean = false;
  private defaultPathEase: PathEase = 'linear';
  private pathsVisible: boolean = true;
  private sceneDurationMs: number = 3000;
  // No persistence (explicitly disabled)

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

  removeScene(scene: Scene): void {
    const idx = this.scenes.indexOf(scene);
    if (idx >= 0) this.scenes.splice(idx, 1);
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

  setSceneDuration(durationMs: number): void {
    const clamped = Math.max(500, durationMs);
    this.sceneDurationMs = clamped;
    this.scenes.forEach(scene => scene.setDuration(clamped));
  }

  getSceneDuration(): number {
    return this.sceneDurationMs;
  }

  setDefaultPathEase(ease: PathEase): void { this.defaultPathEase = ease; }
  getDefaultPathEase(): PathEase { return this.defaultPathEase; }

  setPathsVisible(visible: boolean): void { this.pathsVisible = visible; }
  getPathsVisible(): boolean { return this.pathsVisible; }

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

// ------- Persistence helpers (localStorage baseline) -------
// Note: Persistence intentionally removed per requirements.
