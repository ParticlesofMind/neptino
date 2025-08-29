/**
 * TextFlowManager - Text Wrapping and Layout
 * Handles text line wrapping and positioning calculations
 */

import { Text as PixiText } from "pixi.js";
import { LineInfo, TextPosition, ITextFlowManager } from "./types.js";

export class TextFlowManager implements ITextFlowManager {
  
  /**
   * Wrap text into lines based on maximum width
   */
  public wrapText(text: string, maxWidth: number): LineInfo[] {
    if (!text) {
      return [];
    }

    const lines: LineInfo[] = [];
    const words = text.split(' ');
    let currentLine = '';
    let currentLineStartIndex = 0;
    let charIndex = 0;

    // Create a temporary text object for measuring
    const measureText = new PixiText({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        wordWrap: false
      }
    });

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine.length > 0 ? currentLine + ' ' + word : word;
      
      // Measure the test line
      measureText.text = testLine;
      
      if (measureText.width <= maxWidth || currentLine.length === 0) {
        // Word fits, add it to current line
        if (currentLine.length > 0) {
          currentLine += ' ';
          charIndex++; // Count the space
        }
        currentLine += word;
        charIndex += word.length;
      } else {
        // Word doesn't fit, finalize current line and start new one
        if (currentLine.length > 0) {
          measureText.text = currentLine;
          lines.push({
            text: currentLine,
            width: measureText.width,
            startIndex: currentLineStartIndex,
            endIndex: charIndex - 1
          });

          // Start new line
          currentLineStartIndex = charIndex;
          
          // Handle line break (if there was a space before the word)
          if (i > 0) {
            charIndex++; // Count the space/newline
          }
        }
        
        currentLine = word;
        charIndex += word.length;
      }
    }

    // Add the last line
    if (currentLine.length > 0) {
      measureText.text = currentLine;
      lines.push({
        text: currentLine,
        width: measureText.width,
        startIndex: currentLineStartIndex,
        endIndex: charIndex - 1
      });
    }

    // Cleanup
    measureText.destroy();

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

    // Find character position within the line
    const measureText = new PixiText({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 16
      }
    });

    let closestCharIndex = line.startIndex;
    let closestDistance = Math.abs(position.x);

    // Test each character position in the line
    for (let i = 0; i <= line.text.length; i++) {
      measureText.text = line.text.substring(0, i);
      const charX = measureText.width;
      const distance = Math.abs(position.x - charX);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestCharIndex = line.startIndex + i;
      }
    }

    measureText.destroy();

    // Clamp to valid range
    return Math.max(0, Math.min(closestCharIndex, line.endIndex + 1));
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
