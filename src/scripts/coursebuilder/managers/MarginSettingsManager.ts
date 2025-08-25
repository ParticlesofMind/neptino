/**
 * Margin Settings Manager
 * Manages margin controls and settings for the coursebuilder interface
 * Single Responsibility: Margin configuration and UI updates only
 */

import { marginSettingsHandler } from "../../backend/courses/settings/marginSettings";

export class MarginSettingsManager {
 private marginInputs: { [key: string]: HTMLInputElement } = {};
 private marginValues: { [key: string]: number } = {
 top: 20,
 right: 20,
 bottom: 20,
 left: 20,
 };
 private onMarginChangeCallback:
 | ((margins: { [key: string]: number }) => void)
 | null = null;

 constructor() {
 this.initializeMarginInputs();
 this.bindMarginEvents();
 }

 /**
 * Set callback for margin changes
 */
 setOnMarginChange(
 callback: (margins: { [key: string]: number }) => void,
 ): void {
 this.onMarginChangeCallback = callback;
 }

 /**
 * Set course ID for database persistence
 */
 setCourseId(courseId: string): void {
 marginSettingsHandler.setCourseId(courseId);
 }

 /**
 * Initialize margin input elements
 */
 private initializeMarginInputs(): void {
 const marginInputIds = [
 "marginTop",
 "marginRight",
 "marginBottom",
 "marginLeft",
 ];

 marginInputIds.forEach((id) => {
 const input = document.getElementById(id) as HTMLInputElement;
 if (input) {
 const marginKey = id.replace("margin", "").toLowerCase();
 this.marginInputs[marginKey] = input;
 input.value = this.marginValues[marginKey].toString();
 }
 });
 }

 /**
 * Bind margin input events
 */
 private bindMarginEvents(): void {
 Object.entries(this.marginInputs).forEach(([key, input]) => {
 const inputHandler = () => this.handleMarginChange(key, input);
 const changeHandler = () => this.handleMarginChange(key, input);

 input.addEventListener("input", inputHandler);
 input.addEventListener("change", changeHandler);

 // Store handlers for cleanup
 (input as any).__inputHandler = inputHandler;
 (input as any).__changeHandler = changeHandler;
 });
 }

 /**
 * Handle margin input changes
 */
 private handleMarginChange(marginKey: string, input: HTMLInputElement): void {
 const value = parseInt(input.value) || 0;
 this.marginValues[marginKey] = Math.max(0, value); // Ensure non-negative

 // Update input value to reflect clamped value
 input.value = this.marginValues[marginKey].toString();

 // Trigger callback
 if (this.onMarginChangeCallback) {
 this.onMarginChangeCallback({ ...this.marginValues });
 }
 }

 /**
 * Get current margin values
 */
 getMargins(): { [key: string]: number } {
 return { ...this.marginValues };
 }

 /**
 * Set margin values programmatically
 */
 setMargins(margins: { [key: string]: number }): void {
 Object.entries(margins).forEach(([key, value]) => {
 if (key in this.marginValues) {
 this.marginValues[key] = Math.max(0, value);

 // Update input if it exists
 if (this.marginInputs[key]) {
 this.marginInputs[key].value = this.marginValues[key].toString();
 }
 }
 });

 // Trigger callback
 if (this.onMarginChangeCallback) {
 this.onMarginChangeCallback({ ...this.marginValues });
 }
 }

 /**
 * Set individual margin
 */
 setMargin(marginKey: string, value: number): void {
 if (marginKey in this.marginValues) {
 this.marginValues[marginKey] = Math.max(0, value);

 // Update input if it exists
 if (this.marginInputs[marginKey]) {
 this.marginInputs[marginKey].value =
 this.marginValues[marginKey].toString();
 }

 // Trigger callback
 if (this.onMarginChangeCallback) {
 this.onMarginChangeCallback({ ...this.marginValues });
 }
 }
 }

 /**
 * Reset margins to default values
 */
 resetMargins(): void {
 const defaultMargins = { top: 20, right: 20, bottom: 20, left: 20 };
 this.setMargins(defaultMargins);
 }

 /**
 * Get margin as CSS string
 */
 getMarginsAsCSS(): string {
 const { top, right, bottom, left } = this.marginValues;
 return `${top}px ${right}px ${bottom}px ${left}px`;
 }

 /**
 * Get margin for specific side
 */
 getMargin(side: string): number {
 return this.marginValues[side] || 0;
 }

 /**
 * Check if margins are uniform
 */
 areMarginosUniform(): boolean {
 const values = Object.values(this.marginValues);
 return values.every((value) => value === values[0]);
 }

 /**
 * Apply margins to element
 */
 applyMarginsToElement(element: HTMLElement): void {
 element.style.margin = this.getMarginsAsCSS();
 }

 /**
 * Remove margins from element
 */
 removeMarginsFromElement(element: HTMLElement): void {
 element.style.margin = "";
 }

 /**
 * Export margins configuration
 */
 exportMargins(): { [key: string]: number } {
 return { ...this.marginValues };
 }

 /**
 * Import margins configuration
 */
 importMargins(margins: { [key: string]: number }): void {
 this.setMargins(margins);
 }

 /**
 * Cleanup
 */
 destroy(): void {
 // Remove event listeners
 Object.values(this.marginInputs).forEach((input) => {
 const inputHandler = (input as any).__inputHandler;
 const changeHandler = (input as any).__changeHandler;

 if (inputHandler) {
 input.removeEventListener("input", inputHandler);
 }
 if (changeHandler) {
 input.removeEventListener("change", changeHandler);
 }
 });

 this.marginInputs = {};
 this.onMarginChangeCallback = null;
 }
}
