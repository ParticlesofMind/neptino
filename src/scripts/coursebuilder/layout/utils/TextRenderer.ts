import { Text, type TextStyleOptions } from "pixi.js";

export interface TextCreationOptions {
  x?: number;
  wordWrapWidth?: number;
  align?: "left" | "center" | "right";
}

export class TextRenderer {
  /**
   * Create a text style configuration
   */
  static createTextStyle(
    fontSize: number,
    color: number,
    bold = false,
    italic = false,
  ): TextStyleOptions {
    return {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize,
      fill: color,
      fontWeight: bold ? "600" : "400",
      fontStyle: italic ? "italic" : "normal",
      letterSpacing: 0.2,
      lineHeight: fontSize * 1.4,
    };
  }

  /**
   * Create and configure a text element
   */
  static createText(
    content: string,
    style: TextStyleOptions,
    y: number,
    options?: TextCreationOptions,
  ): Text {
    const textStyle: TextStyleOptions = { ...style };
    
    if (options?.wordWrapWidth !== undefined) {
      textStyle.wordWrap = true;
      textStyle.wordWrapWidth = Math.max(options.wordWrapWidth, 24);
      textStyle.breakWords = true;
    }
    
    if (options?.align) {
      textStyle.align = options.align;
    }

    const text = new Text({
      text: content,
      style: textStyle,
    });
    
    text.y = y;
    if (options?.x !== undefined) {
      text.x = options.x;
    }
    
    this.lockDisplayObject(text);
    return text;
  }

  /**
   * Lock a display object to prevent interaction
   */
  private static lockDisplayObject(object: any): void {
    object.__locked = true;
    
    if ("eventMode" in object) {
      object.eventMode = "none";
    }
    if ("interactive" in object) {
      object.interactive = false;
    }
    if ("interactiveChildren" in object) {
      object.interactiveChildren = false;
    }
    
    try {
      object.cursor = "default";
    } catch {
      /* ignore */
    }
  }
}

