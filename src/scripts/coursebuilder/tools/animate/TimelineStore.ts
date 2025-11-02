export interface PathPoint {
  x: number;
  y: number;
}

export interface Keyframe {
  time: number;
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
}

class TimelineStore {
  private readonly paths = new Map<string, PathPoint[]>();
  private readonly keyframes = new Map<string, Keyframe[]>();

  public setMotionPath(objectId: string, points: PathPoint[]): void {
    this.paths.set(objectId, points);
  }

  public getMotionPath(objectId: string): PathPoint[] {
    return this.paths.get(objectId)?.map((point) => ({ ...point })) ?? [];
  }

  public addKeyframe(objectId: string, keyframe: Keyframe): void {
    const frames = this.keyframes.get(objectId) ?? [];
    const existingIndex = frames.findIndex((frame) => Math.abs(frame.time - keyframe.time) < 1e-3);
    if (existingIndex >= 0) {
      frames[existingIndex] = keyframe;
    } else {
      frames.push(keyframe);
      frames.sort((a, b) => a.time - b.time);
    }
    this.keyframes.set(objectId, frames);
  }

  public getKeyframes(objectId: string): Keyframe[] {
    return this.keyframes.get(objectId)?.map((frame) => ({ ...frame, position: { ...frame.position }, scale: { ...frame.scale } })) ?? [];
  }
}

export const timelineStore = new TimelineStore();
