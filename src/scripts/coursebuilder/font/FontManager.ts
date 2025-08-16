/**
 * Font Manager Core
 * Core font management and family selection
 * Single Responsibility: Font family management and coordination only
 */

import { FontStyleController } from "./FontStyleController.js";
import { FontSizeController } from "./FontSizeController.js";

export class FontManager {
 private currentFont: string = "Arial";
 private availableFonts: Array<{
 name: string;
 family: string;
 loaded: boolean;
 }> = [];
 private fontStyleController: FontStyleController;
 private fontSizeController: FontSizeController;
 private onFontChangeCallback: ((fontFamily: string) => void) | null = null;

 constructor() {
 this.fontStyleController = new FontStyleController();
 this.fontSizeController = new FontSizeController();

 this.initializeDefaultFonts();
 this.bindFontFamilyEvents();
 this.setupControllerCallbacks();
 }

 /**
 * Set callback for font changes
 */
 setOnFontChange(callback: (fontFamily: string) => void): void {
 this.onFontChangeCallback = callback;
 }

 /**
 * Initialize default system fonts
 */
 private initializeDefaultFonts(): void {
 const systemFonts = [
 { name: "Arial", family: "Arial, sans-serif", loaded: true },
 {
 name: "Times New Roman",
 family: "Times New Roman, serif",
 loaded: true,
 },
 { name: "Courier New", family: "Courier New, monospace", loaded: true },
 {
 name: "Helvetica",
 family: "Helvetica, Arial, sans-serif",
 loaded: true,
 },
 { name: "Georgia", family: "Georgia, serif", loaded: true },
 { name: "Verdana", family: "Verdana, sans-serif", loaded: true },
 { name: "Comic Sans MS", family: "Comic Sans MS, cursive", loaded: true },
 { name: "Impact", family: "Impact, sans-serif", loaded: true },
 ];

 this.availableFonts = [...systemFonts];
 this.populateFontSelector();

 }

 /**
 * Bind font family selection events
 */
 private bindFontFamilyEvents(): void {
 const fontSelect = document.getElementById(
 "font-family",
 ) as HTMLSelectElement;
 if (fontSelect) {
 fontSelect.addEventListener("change", this.handleFontChange.bind(this));
 }
 }

 /**
 * Setup controller callbacks
 */
 private setupControllerCallbacks(): void {
 // Font style changes
 this.fontStyleController.setOnStyleChange(() => {
 // Handle style changes
 });

 // Font size changes
 this.fontSizeController.setOnSizeChange(() => {
 // Handle size changes
 });
 }

 /**
 * Handle font family change
 */
 private handleFontChange(event: Event): void {
 const select = event.target as HTMLSelectElement;
 const selectedFont = this.availableFonts.find(
 (font) => font.name === select.value,
 );

 if (selectedFont) {
 this.currentFont = selectedFont.name;

 // Trigger callback
 if (this.onFontChangeCallback) {
 this.onFontChangeCallback(selectedFont.family);
 }
 }
 }

 /**
 * Populate font selector dropdown
 */
 private populateFontSelector(): void {
 const fontSelect = document.getElementById(
 "font-family",
 ) as HTMLSelectElement;
 if (!fontSelect) return;

 fontSelect.innerHTML = this.availableFonts
 .map(
 (font) =>
 `<option value="${font.name}" ${font.name === this.currentFont ? "selected" : ""}>${font.name}</option>`,
 )
 .join("");
 }

 /**
 * Load custom font
 */
 async loadCustomFont(fontName: string, fontUrl: string): Promise<void> {
 try {
 const font = new FontFace(fontName, `url(${fontUrl})`);
 await font.load();
 document.fonts.add(font);

 // Add to available fonts
 const customFont = {
 name: fontName,
 family: `${fontName}, sans-serif`,
 loaded: true,
 };

 this.availableFonts.push(customFont);
 this.populateFontSelector();

 } catch (error) {
 console.error("❌ Failed to load custom font:", fontName, error);
 }
 }

 /**
 * Get current font
 */
 getCurrentFont(): string {
 return this.currentFont;
 }

 /**
 * Get current font family
 */
 getCurrentFontFamily(): string {
 const currentFontObj = this.availableFonts.find(
 (font) => font.name === this.currentFont,
 );
 return currentFontObj?.family || "Arial, sans-serif";
 }

 /**
 * Set current font
 */
 setCurrentFont(fontName: string): void {
 const font = this.availableFonts.find((f) => f.name === fontName);
 if (font) {
 this.currentFont = fontName;

 // Update selector
 const fontSelect = document.getElementById(
 "font-family",
 ) as HTMLSelectElement;
 if (fontSelect) {
 fontSelect.value = fontName;
 }

 // Trigger callback
 if (this.onFontChangeCallback) {
 this.onFontChangeCallback(font.family);
 }
 }
 }

 /**
 * Get available fonts
 */
 getAvailableFonts(): Array<{
 name: string;
 family: string;
 loaded: boolean;
 }> {
 return [...this.availableFonts];
 }

 /**
 * Get font style controller
 */
 getStyleController(): FontStyleController {
 return this.fontStyleController;
 }

 /**
 * Get font size controller
 */
 getSizeController(): FontSizeController {
 return this.fontSizeController;
 }

 /**
 * Get complete font configuration
 */
 getCurrentFontConfig(): {
 family: string;
 size: number;
 styles: { bold: boolean; italic: boolean; underline: boolean };
 } {
 return {
 family: this.getCurrentFontFamily(),
 size: this.fontSizeController.getCurrentSize(),
 styles: this.fontStyleController.getCurrentStyles(),
 };
 }

 /**
 * Apply font configuration to element
 */
 applyFontToElement(element: HTMLElement): void {
 const config = this.getCurrentFontConfig();

 element.style.fontFamily = config.family;
 element.style.fontSize = `${config.size}px`;

 this.fontStyleController.applyStylesToElement(element);
 }

 /**
 * Reset all font settings to defaults
 */
 resetToDefaults(): void {
 this.setCurrentFont("Arial");
 this.fontSizeController.reset();
 this.fontStyleController.resetStyles();
 }

 /**
 * Cleanup
 */
 destroy(): void {
 this.fontStyleController.destroy();
 this.fontSizeController.destroy();
 this.onFontChangeCallback = null;
 }
}
