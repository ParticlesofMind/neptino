/**
 * Text Tool
 * Professional text area system with rich formatting and proper canvas integration
 */

import {
 FederatedPointerEvent,
 Container,
 Text,
 TextStyle,
 Point,
} from "pixi.js";
import { BaseTool } from "./ToolInterface";
import {
 PROFESSIONAL_COLORS,
 TEXT_SIZES,
 FONT_FAMILIES,
 TEXT_CONSTANTS,
} from "./SharedResources";
import { BoundaryUtils } from "./BoundaryUtils";

interface TextSettings {
 fontFamily: string;
 fontSize: number;
 color: string;
 fontWeight: string;
 fontStyle: string;
 align: string;
}

export class TextTool extends BaseTool {
 private activeTextArea: HTMLTextAreaElement | null = null;
 private textPosition: Point = new Point(0, 0);
 private currentContainer: Container | null = null;
 private isTextAreaJustCreated: boolean = false;

 constructor() {
 super("text", "text");
 this.settings = {
 fontFamily: FONT_FAMILIES[0], // Start with Inter
 fontSize: TEXT_SIZES[4], // Start with 16px
 color: PROFESSIONAL_COLORS[0], // Start with dark charcoal
 fontWeight: "normal",
 fontStyle: "normal",
 align: "left",
 };
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   console.log('📝 TEXT: Ignoring pointer down - tool not active');
   return;
 }

 console.log(
 `📝 TEXT: Text placement at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
 );
 console.log(
 `📝 TEXT: Settings - Font: ${this.settings.fontFamily}, Size: ${this.settings.fontSize}px, Color: ${this.settings.color}`,
 );

 const localPoint = container.toLocal(event.global);
 
 // 🚫 MARGIN PROTECTION: Prevent creation in margin areas
 const canvasBounds = this.manager.getCanvasBounds();
 if (!BoundaryUtils.isPointInContentArea(localPoint, canvasBounds)) {
 console.log(`📝 TEXT: 🚫 Click in margin area rejected - point (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)}) outside content area`);
 return; // Exit early - no creation allowed in margins
 }
 
 this.textPosition.copyFrom(localPoint);
 this.currentContainer = container; // Store the container

 this.createTextArea(event.global.x, event.global.y, container);
 }

 onPointerMove(): void {
 // Text tool doesn't need move events for placement
 }

 onPointerUp(): void {
 // Text tool doesn't need up events for placement
 }

 private createTextArea(x: number, y: number, container: Container): void {
 // Remove any existing text area
 this.removeTextArea();

 console.log(
 `📝 TEXT: Creating text area at global (${Math.round(x)}, ${Math.round(y)}), local (${Math.round(this.textPosition.x)}, ${Math.round(this.textPosition.y)})`,
 );

 // Get canvas bounds for proper positioning
 const canvasElement = document.querySelector("#canvas-container canvas");
 let adjustedX = x;
 let adjustedY = y;

 if (canvasElement) {
 const canvasRect = canvasElement.getBoundingClientRect();
 
 // Use the global click coordinates directly - they're already in screen space
 // The x, y parameters are the global mouse position from the event
 adjustedX = x;
 adjustedY = y;
 
 // Ensure text area stays within canvas bounds
 const textAreaWidth = 240;
 const textAreaHeight = 80;
 
 // Adjust X coordinate to keep within canvas bounds
 if (adjustedX + textAreaWidth > canvasRect.right) {
 adjustedX = canvasRect.right - textAreaWidth - 10;
 }
 if (adjustedX < canvasRect.left) {
 adjustedX = canvasRect.left + 10;
 }
 
 // Adjust Y coordinate to keep within canvas bounds  
 if (adjustedY + textAreaHeight > canvasRect.bottom) {
 adjustedY = canvasRect.bottom - textAreaHeight - 10;
 }
 if (adjustedY < canvasRect.top) {
 adjustedY = canvasRect.top + 10;
 }
 
 console.log(
 `📝 TEXT: Canvas rect:`, canvasRect,
 `Global click position: (${Math.round(x)}, ${Math.round(y)})`,
 `Final position: (${Math.round(adjustedX)}, ${Math.round(adjustedY)})`,
 );
 } else {
 console.warn('📝 TEXT: Canvas element not found, using click position directly');
 adjustedX = x;
 adjustedY = y;
 }

 // Create HTML textarea for professional text entry
 this.activeTextArea = document.createElement("textarea");

 // Apply proper CSS classes for styling - no inline styles
 this.activeTextArea.className = "input input--textarea auto-resize";
 this.activeTextArea.style.left = `${adjustedX}px`;
 this.activeTextArea.style.top = `${adjustedY}px`;
 
 // Apply settings through CSS properties only for dynamic styles
 this.updateTextAreaSettings();
 
 this.activeTextArea.placeholder = "Enter your text here...";

 // Professional interaction
 this.activeTextArea.rows = 3;
 this.activeTextArea.cols = 30;

 // Add to document body instead of canvas container for better control
 document.body.appendChild(this.activeTextArea);
 
 // Set flag to prevent immediate blur
 this.isTextAreaJustCreated = true;
 
 // Focus the text area after a small delay to ensure it's properly mounted
 setTimeout(() => {
 if (this.activeTextArea) {
 this.activeTextArea.focus();
 this.activeTextArea.select(); // Select all text for immediate editing
 
 // Clear the "just created" flag after a reasonable delay
 setTimeout(() => {
 this.isTextAreaJustCreated = false;
 }, 500);
 
 // Add blur event listener after focus is established to prevent immediate blur
 this.activeTextArea.addEventListener("blur", this.handleTextBlur.bind(this));
 }
 }, 10);

 // Handle keyboard events immediately
 this.activeTextArea.addEventListener("keydown", (e) => {
 if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
 // Ctrl+Enter or Cmd+Enter to finalize
 e.preventDefault();
 this.finalizeText(container);
 } else if (e.key === "Escape") {
 e.preventDefault();
 this.removeTextArea();
 }
 // Allow normal Enter for line breaks
 });

 // Prevent the text area from losing focus when clicked
 this.activeTextArea.addEventListener("mousedown", (e) => {
 e.stopPropagation(); // Prevent canvas from handling the click
 });

 this.activeTextArea.addEventListener("click", (e) => {
 e.stopPropagation(); // Prevent canvas from handling the click
 });

 // Auto-resize textarea as user types
 this.activeTextArea.addEventListener("input", () => {
 this.autoResizeTextArea();
 });
 }

 private handleTextBlur(): void {
 // Don't finalize if text area was just created
 if (this.isTextAreaJustCreated) {
 console.log('📝 TEXT: Ignoring blur event - text area just created');
 return;
 }
 
 // Add a longer delay and check if the text area still exists and has focus
 setTimeout(() => {
 if (this.activeTextArea && document.activeElement !== this.activeTextArea && this.currentContainer) {
 // Only finalize if something else has focus, text area still exists, and we have a container
 console.log('📝 TEXT: Finalizing text due to blur event');
 this.finalizeText(this.currentContainer);
 }
 }, 200); // Longer delay to prevent accidental blur
 }

 private autoResizeTextArea(): void {
 if (!this.activeTextArea) return;

 // Reset height to auto to get proper scrollHeight
 this.activeTextArea.style.height = "auto";

 // Set height to scrollHeight with some padding
 const newHeight = Math.max(
 TEXT_CONSTANTS.MIN_TEXT_AREA_SIZE.height,
 this.activeTextArea.scrollHeight + 4,
 );

 this.activeTextArea.style.height = `${newHeight}px`;
 }

 private finalizeText(container: Container): void {
 if (!this.activeTextArea) return;

 const textContent = this.activeTextArea.value.trim();

 if (textContent) {
        // Create professional PixiJS text object
        const style = new TextStyle({
            fontFamily: this.settings.fontFamily,
            fontSize: this.settings.fontSize,
            fontWeight: this.settings.fontWeight,
            fontStyle: this.settings.fontStyle,
            fill: this.settings.color,
            align: this.settings.align as any,
            wordWrap: true,
            wordWrapWidth: 400, // Reasonable wrap width
            lineHeight: this.settings.fontSize * 1.2, // Professional line spacing
            padding: 4, // Prevent text clipping
        });

        const textObject = new Text({ text: textContent, style });
        
        // No need for high resolution since we're using 3x canvas size with resolution: 1
 textObject.position.set(this.textPosition.x, this.textPosition.y);
 textObject.eventMode = "static"; // Make it selectable for future tools

 container.addChild(textObject);

 console.log(
 `📝 TEXT: Professional text object created and added to canvas`,
 );
 }

 this.removeTextArea();
 }

 private removeTextArea(): void {
 if (this.activeTextArea && this.activeTextArea.parentNode) {
 this.activeTextArea.parentNode.removeChild(this.activeTextArea);
 this.activeTextArea = null;
 }
 this.currentContainer = null; // Clear the container reference
 this.isTextAreaJustCreated = false; // Reset the flag
 }

 onDeactivate(): void {
 super.onDeactivate();
 // Don't remove text area when switching tools - let it persist
 // this.removeTextArea(); // Commented out to keep text areas persistent
 
 console.log('📝 TEXT: Tool deactivated - keeping text areas persistent');
 }

 updateSettings(settings: TextSettings): void {
 this.settings = { ...this.settings, ...settings };

 // Update active text area if it exists - only dynamic properties
 if (this.activeTextArea) {
 this.updateTextAreaSettings();
 }
 }

 // Get available fonts for UI
 static getAvailableFonts(): string[] {
 return FONT_FAMILIES;
 }

 /**
 * Update text area settings based on current tool settings
 * Only applies dynamic properties that change based on user settings
 */
 private updateTextAreaSettings(): void {
 if (!this.activeTextArea) return;
 
 // Only set the dynamic properties that need to change based on settings
 this.activeTextArea.style.fontSize = `${this.settings.fontSize}px`;
 this.activeTextArea.style.fontFamily = this.settings.fontFamily;
 this.activeTextArea.style.fontWeight = this.settings.fontWeight;
 this.activeTextArea.style.fontStyle = this.settings.fontStyle;
 this.activeTextArea.style.color = this.settings.color;
 this.activeTextArea.style.textAlign = this.settings.align as any;
 }

 // Get available text sizes for UI
 static getAvailableTextSizes(): number[] {
 return TEXT_SIZES;
 }

 // Get available colors for UI
 static getAvailableColors(): string[] {
 return PROFESSIONAL_COLORS;
 }

 // Get text alignment options
 static getAlignmentOptions(): string[] {
 return ["left", "center", "right", "justify"];
 }

 // Get font weight options
 static getFontWeights(): string[] {
 return [
 "normal",
 "bold",
 "100",
 "200",
 "300",
 "400",
 "500",
 "600",
 "700",
 "800",
 "900",
 ];
 }

 // Get font style options
 static getFontStyles(): string[] {
 return ["normal", "italic", "oblique"];
 }
}
