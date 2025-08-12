/**
 * PixiJS Scene Inspector
 * Real-time debugging utility for understanding scene structure
 */

export class PixiSceneInspector {
  private app: any = null;
  private intervalId: number | null = null;
  private isInspecting: boolean = false;

  constructor(app?: any) {
    this.app = app;
  }

  /**
   * Set the PixiJS application to inspect
   */
  public setApp(app: any): void {
    this.app = app;
  }

  /**
   * Start continuous scene monitoring
   */
  public startInspection(intervalMs: number = 2000): void {
    if (this.isInspecting) {
      return;
    }

    this.isInspecting = true;

    // Initial inspection
    this.inspectScene();

    // Set up continuous monitoring
    this.intervalId = window.setInterval(() => {
      this.inspectScene();
    }, intervalMs);
  }

  /**
   * Stop continuous scene monitoring
   */
  public stopInspection(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isInspecting = false;
  }

  /**
   * Perform a one-time scene inspection
   */
  public inspectScene(): void {
    if (!this.app) {
      console.warn("⚠️ No PixiJS app set for inspection");
      return;
    }

    const stats = this.gatherSceneStats();
    this.displaySceneReport(stats);
  }

  /**
   * Gather comprehensive scene statistics
   */
  private gatherSceneStats(): any {
    const stage = this.app.stage;
    const stats = {
      timestamp: new Date().toLocaleTimeString(),
      totals: { containers: 0, graphics: 0, sprites: 0, text: 0, other: 0 },
      objects: [] as any[],
      hierarchy: this.buildHierarchy(stage),
    };

    this.walkScene(stage, (object: any, depth: number) => {
      const type = object.constructor.name.toLowerCase();
      const objectInfo = {
        name: object.label || object.name || "unnamed",
        type: object.constructor.name,
        depth: depth,
        children: object.children?.length || 0,
        visible: object.visible,
        position: { x: Math.round(object.x), y: Math.round(object.y) },
        size: this.getObjectSize(object),
      };

      stats.objects.push(objectInfo);

      // Count by type
      if (type.includes("container")) {
        stats.totals.containers++;
      } else if (type.includes("graphics")) {
        stats.totals.graphics++;
      } else if (type.includes("sprite")) {
        stats.totals.sprites++;
      } else if (type.includes("text")) {
        stats.totals.text++;
      } else {
        stats.totals.other++;
      }
    });

    return stats;
  }

  /**
   * Walk through all objects in the scene
   */
  private walkScene(
    object: any,
    callback: (obj: any, depth: number) => void,
    depth: number = 0,
  ): void {
    callback(object, depth);

    if (object.children) {
      object.children.forEach((child: any) => {
        this.walkScene(child, callback, depth + 1);
      });
    }
  }

  /**
   * Build hierarchical representation of the scene
   */
  private buildHierarchy(object: any, depth: number = 0): any {
    const hierarchy = {
      name: object.label || object.name || "unnamed",
      type: object.constructor.name,
      depth: depth,
      children: [] as any[],
    };

    if (object.children) {
      hierarchy.children = object.children.map((child: any) =>
        this.buildHierarchy(child, depth + 1),
      );
    }

    return hierarchy;
  }

  /**
   * Get object size information
   */
  private getObjectSize(object: any): any {
    try {
      if (object.getBounds) {
        const bounds = object.getBounds();
        return {
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
        };
      }
    } catch (error) {
      // Some objects might not have getBounds
    }
    return { width: "unknown", height: "unknown" };
  }

  /**
   * Display comprehensive scene report
   */
  private displaySceneReport(stats: any): void {
    const total = Object.values(stats.totals).reduce(
      (sum: number, count: unknown) => sum + (count as number),
      0,
    );

    console.group(`🎭 Scene Inspection Report (${stats.timestamp})`);

    // Summary
    console.log("📈 Breakdown:", {
      Containers: stats.totals.containers,
      Graphics: stats.totals.graphics,
      Sprites: stats.totals.sprites,
      Text: stats.totals.text,
      Other: stats.totals.other,
    });

    // Hierarchy visualization
    console.group("🌳 Scene Hierarchy:");
    this.printHierarchy(stats.hierarchy);
    console.groupEnd();

    // Object details
    if (stats.objects.length <= 10) {
      console.group("🔍 Object Details:");
      stats.objects.forEach((obj: any, index: number) => {
        const indent = "  ".repeat(obj.depth);
        console.log(`${indent}${index}: ${obj.name} (${obj.type})`, {
          position: obj.position,
          size: obj.size,
          visible: obj.visible,
          children: obj.children,
        });
      });
      console.groupEnd();
    } else {
      console.log(
        `📝 Object count too high (${stats.objects.length}) for detailed view`,
      );
    }

    console.groupEnd();
  }

  /**
   * Print hierarchy in a tree-like format
   */
  private printHierarchy(
    node: any,
    prefix: string = "",
    isLast: boolean = true,
  ): void {
    const connector = isLast ? "└── " : "├── ";
    const display = `${node.name} (${node.type})`;

    if (node.children && node.children.length > 0) {
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      node.children.forEach((child: any, index: number) => {
        const isLastChild = index === node.children.length - 1;
        this.printHierarchy(child, newPrefix, isLastChild);
      });
    }
  }

  /**
   * Get current scene statistics
   */
  public getStats(): any {
    if (!this.app) return null;
    return this.gatherSceneStats();
  }

  /**
   * Export scene structure as JSON
   */
  public exportSceneStructure(): string {
    const stats = this.getStats();
    return JSON.stringify(stats, null, 2);
  }

  /**
   * Find objects by name pattern
   */
  public findObjects(namePattern: string | RegExp): any[] {
    if (!this.app) return [];

    const found: any[] = [];
    const pattern =
      typeof namePattern === "string"
        ? new RegExp(namePattern, "i")
        : namePattern;

    this.walkScene(this.app.stage, (object: any) => {
      const objectName = object.label || object.name || "";
      if (pattern.test(objectName)) {
        found.push({
          name: objectName,
          type: object.constructor.name,
          object: object,
        });
      }
    });

    return found;
  }

  /**
   * Count objects by type
   */
  public countByType(): { [key: string]: number } {
    if (!this.app) return {};

    const counts: { [key: string]: number } = {};

    this.walkScene(this.app.stage, (object: any) => {
      const type = object.constructor.name;
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }
}

// Global inspector instance for console use
(window as any).pixiInspector = new PixiSceneInspector();

// Auto-setup inspector when course builder is ready
window.addEventListener("pixi-app-ready", (event: any) => {
  const app = event.detail;
  (window as any).pixiInspector.setApp(app);

  console.log(
    "  window.pixiInspector.startInspection() - Start continuous monitoring",
  );
  console.log(
    '  window.pixiInspector.findObjects("grid") - Find objects by name',
  );
});

export default PixiSceneInspector;
