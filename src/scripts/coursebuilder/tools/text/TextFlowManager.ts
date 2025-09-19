/**
 * TextFlowManager - Text Wrapping and Layout
 * Handles text line wrapping and positioning calculations
 */

import { Text as PixiText } from "pixi.js";
import { LineInfo, TextPosition, ITextFlowManager } from "./types.js";

export class TextFlowManager implements ITextFlowManager {
  private measureText: PixiText | null = null;

  private ensureMeasure(): PixiText {
    if (!this.measureText) {
      this.measureText = new PixiText({
        text: '',
        style: { fontFamily: 'Arial', fontSize: 16, wordWrap: false, whiteSpace: 'pre' }
      });
    }
    return this.measureText;
  }

  public setStyle(style: any): void {
    const m = this.ensureMeasure();
    try {
      if (m && m.style) {
        (m.style as any).fontFamily = (style as any)?.fontFamily || (m.style as any).fontFamily;
        (m.style as any).fontSize = (style as any)?.fontSize || (m.style as any).fontSize;
        (m.style as any).fontWeight = (style as any)?.fontWeight || (m.style as any).fontWeight;
        (m.style as any).fontStyle = (style as any)?.fontStyle || (m.style as any).fontStyle;
        (m.style as any).whiteSpace = 'pre';
        (m.style as any).wordWrap = false;
      }
    } catch {}
  }

  public destroy(): void {
    try { this.measureText?.destroy(); } catch {}
    this.measureText = null;
  }
  
  /**
   * Wrap text into lines based on maximum width
   */
  public wrapText(text: string, maxWidth: number): LineInfo[] {
    if (text === undefined || text === null) return [];

    // Tokenize into sequences to preserve spaces and explicit newlines
    // Tokens: "\n" | consecutive whitespace | consecutive non-whitespace
    const tokens = String(text).match(/\n|\s+|\S+/g) || [];

    const lines: LineInfo[] = [];
    let currentLine = '';
    let currentLineStartIndex = 0;
    let charIndex = 0;

    const measureText = this.ensureMeasure();

    const pushCurrentLine = () => {
      measureText.text = currentLine;
      lines.push({
        text: currentLine,
        width: measureText.width,
        startIndex: currentLineStartIndex,
        endIndex: Math.max(currentLineStartIndex, charIndex - 1)
      });
    };

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok === '\n') {
        // Explicit line break: finalize current line (even if empty)
        pushCurrentLine();
        charIndex += 1; // count the newline character
        currentLine = '';
        currentLineStartIndex = charIndex;
        continue;
      }

      const testLine = currentLine + tok;
      measureText.text = testLine;

      if (measureText.width <= maxWidth || currentLine.length === 0) {
        // Fits or starting a new line
        currentLine = testLine;
        charIndex += tok.length;
      } else {
        // Doesn't fit: finalize current line and start a new one with token
        pushCurrentLine();
        currentLineStartIndex = charIndex;
        currentLine = tok;
        charIndex += tok.length;
      }
    }

    // Push the final line (even if empty to represent trailing newline)
    pushCurrentLine();

    return lines;
  }

  /**
   * Calculate total text bounds for given text and width constraint
   */
  public calculateTextBounds(text: string, maxWidth: number): { width: number; height: number } {
    const lines = this.wrapText(text, maxWidth);
    
    if (lines.length === 0) {
      return { width: 0, height: 0 };
    }

    const maxLineWidth = Math.max(...lines.map(line => line.width));
    const totalHeight = lines.length * 20; // Assume 20px line height for now
    
    return {
      width: Math.min(maxLineWidth, maxWidth),
      height: totalHeight
    };
  }

  /**
   * Get which line a character index belongs to
   */
  public getLineFromCharIndex(charIndex: number, lines: LineInfo[]): number {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (charIndex >= line.startIndex && charIndex <= line.endIndex + 1) {
        return i;
      }
    }
    return Math.max(0, lines.length - 1);
  }

  /**
   * Get character index from a position within the text area
   */
  public getCharIndexFromPosition(position: TextPosition, lines: LineInfo[], lineHeight: number): number {
    if (lines.length === 0) {
      return 0;
    }

    // Determine which line the position is in
    const lineIndex = Math.floor(position.y / lineHeight);
    const clampedLineIndex = Math.max(0, Math.min(lineIndex, lines.length - 1));
    const line = lines[clampedLineIndex];

    if (!line) {
      return 0;
    }

    // Find character position within the line using persistent measurement
    const measureText = this.ensureMeasure();

    let closestCharIndex = line.startIndex;
    let closestDistance = Math.abs(position.x);

    // Test each character position in the line more precisely
    for (let i = 0; i <= line.text.length; i++) {
      measureText.text = line.text.substring(0, i);
      const charX = measureText.width;
      const distance = Math.abs(position.x - charX);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestCharIndex = line.startIndex + i;
      } else if (distance > closestDistance && i > 0) {
        // We've moved past the closest point, so break early for efficiency
        break;
      }
    }

    // Clamp to valid range
    const maxIndex = line.endIndex + 1;
    return Math.max(line.startIndex, Math.min(closestCharIndex, maxIndex));
  }

  /**
   * Handle manual line breaks in text
   */
  public processLineBreaks(text: string): string {
    // For now, just replace \n with actual line breaks
    return text.replace(/\\n/g, '\n');
  }

  /**
   * Calculate optimal text area height for given text and width
   */
  public calculateOptimalHeight(text: string, maxWidth: number, lineHeight: number = 20): number {
    const lines = this.wrapText(text, maxWidth);
    return Math.max(lineHeight * 2, lines.length * lineHeight + 10); // Minimum 2 lines, plus padding
  }
}
