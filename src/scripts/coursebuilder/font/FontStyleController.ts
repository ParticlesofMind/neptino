/**
 * Font Style Controller
 * Manages font styling controls (bold, italic, underline) and related UI
 * Single Responsibility: Font style management only
 */

export class FontStyleController {
 private onStyleChangeCallback:
 | ((styles: {
 bold?: boolean;
 italic?: boolean;
 underline?: boolean;
 }) => void)
 | null = null;

 constructor() {
 this.bindStyleEvents();
 }

 /**
 * Set callback for style changes
 */
 setOnStyleChange(
 callback: (styles: {
 bold?: boolean;
 italic?: boolean;
 underline?: boolean;
 }) => void,
 ): void {
 this.onStyleChangeCallback = callback;
 }

 /**
 * Bind font style events
 */
 private bindStyleEvents(): void {
 // Bold button
 const boldBtn = document.getElementById("font-bold");
 if (boldBtn) {
 boldBtn.addEventListener("click", this.toggleBold.bind(this));
 }

 // Italic button
 const italicBtn = document.getElementById("font-italic");
 if (italicBtn) {
 italicBtn.addEventListener("click", this.toggleItalic.bind(this));
 }

 // Underline button
 const underlineBtn = document.getElementById("font-underline");
 if (underlineBtn) {
 underlineBtn.addEventListener("click", this.toggleUnderline.bind(this));
 }
 }

 /**
 * Toggle bold styling
 */
 private toggleBold(): void {
 const boldBtn = document.getElementById("font-bold");
 if (boldBtn) {
 boldBtn
 const isActive = boldBtn

 // Trigger callback
 if (this.onStyleChangeCallback) {
 this.onStyleChangeCallback({ bold: isActive });
 }

 // Emit custom event
 const boldEvent = new CustomEvent("fontBoldToggle", {
 detail: { active: isActive },
 });
 document.dispatchEvent(boldEvent);
 }
 }

 /**
 * Toggle italic styling
 */
 private toggleItalic(): void {
 const italicBtn = document.getElementById("font-italic");
 if (italicBtn) {
 italicBtn
 const isActive = italicBtn

 // Trigger callback
 if (this.onStyleChangeCallback) {
 this.onStyleChangeCallback({ italic: isActive });
 }

 // Emit custom event
 const italicEvent = new CustomEvent("fontItalicToggle", {
 detail: { active: isActive },
 });
 document.dispatchEvent(italicEvent);
 }
 }

 /**
 * Toggle underline styling
 */
 private toggleUnderline(): void {
 const underlineBtn = document.getElementById("font-underline");
 if (underlineBtn) {
 underlineBtn
 const isActive = underlineBtn

 // Trigger callback
 if (this.onStyleChangeCallback) {
 this.onStyleChangeCallback({ underline: isActive });
 }

 // Emit custom event
 const underlineEvent = new CustomEvent("fontUnderlineToggle", {
 detail: { active: isActive },
 });
 document.dispatchEvent(underlineEvent);
 }
 }

 /**
 * Get current font styles
 */
 getCurrentStyles(): { bold: boolean; italic: boolean; underline: boolean } {
 return {
 bold:
 document.getElementById("font-bold")?
 }

 /**
 * Apply font styles
 */
 applyStyles(styles: {
 bold?: boolean;
 italic?: boolean;
 underline?: boolean;
 }): void {
 if (styles.bold !== undefined) {
 const boldBtn = document.getElementById("font-bold");
 if (boldBtn) {
 boldBtn
 }
 }

 if (styles.italic !== undefined) {
 const italicBtn = document.getElementById("font-italic");
 if (italicBtn) {
 italicBtn
 }
 }

 if (styles.underline !== undefined) {
 const underlineBtn = document.getElementById("font-underline");
 if (underlineBtn) {
 underlineBtn
 }
 }

 // Trigger callback for all applied styles
 if (this.onStyleChangeCallback) {
 this.onStyleChangeCallback(styles);
 }
 }

 /**
 * Reset all styles to default (off)
 */
 resetStyles(): void {
 this.applyStyles({ bold: false, italic: false, underline: false });
 }

 /**
 * Check if any styles are active
 */
 hasActiveStyles(): boolean {
 const styles = this.getCurrentStyles();
 return styles.bold || styles.italic || styles.underline;
 }

 /**
 * Get active styles as CSS text properties
 */
 getStylesAsCSS(): {
 fontWeight?: string;
 fontStyle?: string;
 textDecoration?: string;
 } {
 const styles = this.getCurrentStyles();
 const css: {
 fontWeight?: string;
 fontStyle?: string;
 textDecoration?: string;
 } = {};

 if (styles.bold) css.fontWeight = "bold";
 if (styles.italic) css.fontStyle = "italic";
 if (styles.underline) css.textDecoration = "underline";

 return css;
 }

 /**
 * Apply styles to element
 */
 applyStylesToElement(element: HTMLElement): void {
 const cssStyles = this.getStylesAsCSS();

 element.style.fontWeight = cssStyles.fontWeight || "normal";
 element.style.fontStyle = cssStyles.fontStyle || "normal";
 element.style.textDecoration = cssStyles.textDecoration || "none";
 }

 /**
 * Cleanup
 */
 destroy(): void {
 this.onStyleChangeCallback = null;
 }
}
