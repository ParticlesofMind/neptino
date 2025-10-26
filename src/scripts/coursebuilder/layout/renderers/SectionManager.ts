import { Container, Graphics } from "pixi.js";
import type { Layout } from "@pixi/layout";
import { TextRenderer } from "../utils/TextRenderer.js";

export interface SectionReferences {
  container: Container;
  background: Graphics;
  content: Container;
}

export class SectionManager {
  /**
   * Create section container with background and content
   */
  static create(
    section: "header" | "body" | "footer",
    onLayout: (layout: Layout, width: number, height: number) => void,
  ): SectionReferences {
    const container = new Container({
      layout: {
        width: "100%",
        flexDirection: "column",
        justifyContent: section === "body" ? "flex-start" : "center",
        alignItems: "stretch",
      },
    });
    SectionManager.lockDisplayObject(container);
    container.sortableChildren = false;

    const background = new Graphics();
    background.label = `${section}-background`;
    SectionManager.lockDisplayObject(background);

    const content = new Container();
    content.label = `${section}-content`;
    SectionManager.lockDisplayObject(content);

    container.addChild(background, content);

    container.on("layout", (layout: Layout) => {
      onLayout(layout, layout.computedLayout.width, layout.computedLayout.height);
    });

    return { container, background, content };
  }

  /**
   * Update section metrics (dimensions)
   */
  static updateMetrics(
    sections: Record<"header" | "body" | "footer", SectionReferences>,
    layoutBounds: { width: number; height: number },
    margins: { top: number; right: number; bottom: number; left: number },
  ): void {
    const { width, height } = layoutBounds;
    const headerHeight = margins.top;
    const footerHeight = margins.bottom;
    const bodyHeight = Math.max(height - headerHeight - footerHeight, 0);

    sections.header.container.layout = {
      width,
      height: headerHeight,
      flexGrow: 0,
      flexShrink: 0,
    };

    sections.body.container.layout = {
      width,
      height: bodyHeight,
      flexGrow: 1,
      flexShrink: 1,
    };

    sections.footer.container.layout = {
      width,
      height: footerHeight,
      flexGrow: 0,
      flexShrink: 0,
    };
  }

  /**
   * Redraw section background
   */
  static redrawBackground(
    section: "header" | "body" | "footer",
    ref: SectionReferences,
    width: number,
    height: number,
  ): void {
    ref.background.clear();
    
    // White background
    ref.background.rect(0, 0, Math.max(width, 0), Math.max(height, 0)).fill({
      color: 0xffffff,
      alpha: 1,
    });
    
    // Add subtle borders for better visual separation
    if (section === "header") {
      // Bottom border for header
      ref.background.rect(0, height - 1, width, 1).fill({ color: 0xe5e7eb, alpha: 0.8 });
    } else if (section === "footer") {
      // Top border for footer
      ref.background.rect(0, 0, width, 1).fill({ color: 0xe5e7eb, alpha: 0.8 });
    } else if (section === "body") {
      // Subtle border around body
      ref.background.stroke({ color: 0xf3f4f6, alpha: 0.5, width: 1 });
    }
  }

  /**
   * Position content within section
   */
  static positionContent(
    section: SectionReferences,
    horizontal: number,
  ): void {
    const ref = section;
    ref.content.position.set(horizontal, 0);
  }

  /**
   * Clear content container
   */
  static clearContent(container: Container): void {
    const removed = container.removeChildren();
    removed.forEach((child) => {
      if (child && typeof (child as any).destroy === "function") {
        try {
          (child as any).destroy({ children: true });
        } catch {
          (child as any).destroy?.();
        }
      }
    });
  }

  /**
   * Lock a display object to prevent interaction
   */
  private static lockDisplayObject(object: Container | Graphics): void {
    const target = object as any;
    target.__locked = true;
    if ("eventMode" in target) {
      target.eventMode = "none";
    }
    if ("interactive" in target) {
      target.interactive = false;
    }
    if ("interactiveChildren" in target) {
      target.interactiveChildren = false;
    }
    try {
      target.cursor = "default";
    } catch {
      /* ignore */
    }
  }
}

