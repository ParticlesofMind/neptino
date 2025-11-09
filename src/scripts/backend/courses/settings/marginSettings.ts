/**
 * Margin Settings Handler
 * Handles margin settings UI and database persistence for course canvas
 */

import { supabase } from "../../supabase";
import { UnitConverter } from "../../../coursebuilder/utils/UnitConverter";

export interface MarginSettings {
 top: number;
 bottom: number;
 left: number;
 right: number;
 unit: "inches" | "centimeters";
}

export class MarginSettingsHandler {
 private courseId: string | null = null;
 private currentSettings: MarginSettings;
 private saveTimeout: ReturnType<typeof setTimeout> | null = null;
 private courseBuilder: any = null; // Will be set when course builder is available

 constructor() {
 // Default values in centimeters
 this.currentSettings = {
 top: 2.54,
 bottom: 2.54,
 left: 2.54,
 right: 2.54,
 unit: "centimeters",
 };

 // Load from local storage if available
 this.init();
 }

 private init(): void {
 this.bindEvents();
 this.updateUnitDisplays();
 this.updateInputValues(); // Ensure UI shows default values
 console.log(
 "📏 Margin Settings Handler initialized with defaults:",
 this.currentSettings,
 );
 }

 private bindEvents(): void {
 // Unit toggle events
 const unitInputs = document.querySelectorAll('input[name="margin-unit"]');
 unitInputs.forEach((input) => {
 input.addEventListener("change", (e) => this.handleUnitChange(e));
 });

 // Margin input events
 const marginInputs = document.querySelectorAll('.margin-setting input');
 marginInputs.forEach((input) => {
 input.addEventListener("input", (e) => this.handleMarginChange(e));
 input.addEventListener("change", (e) => this.handleMarginChange(e)); // For when user leaves field
 });
 }

 private handleUnitChange(event: Event): void {
 const input = event.target as HTMLInputElement;
 const newUnit = input.value as "inches" | "centimeters";

 // Convert current values to new unit
 if (newUnit !== this.currentSettings.unit) {
 this.convertMarginUnits(this.currentSettings.unit, newUnit);
 this.currentSettings.unit = newUnit;
 this.updateInputValues();
 this.updateUnitDisplays();
 this.saveSettingsToDatabase();
 this.updateCanvasMargins();
 }
 }

 private handleMarginChange(event: Event): void {
 const input = event.target as HTMLInputElement;
 const marginType = input.name.replace("margin_", "") as keyof Omit<
 MarginSettings,
 "unit"
 >;
 const value = parseFloat(input.value) || 0;

 console.log(
 `📏 Margin ${marginType} changed to: ${value} ${this.currentSettings.unit}`,
 );

 // Update current settings
 this.currentSettings[marginType] = value;

 // Show saving status
 this.showSaveStatus("saving");

 // Debounce saving to database
 if (this.saveTimeout) {
 clearTimeout(this.saveTimeout);
 }

 this.saveTimeout = setTimeout(() => {
 this.saveSettingsToDatabase();
 this.updateCanvasMargins();
 }, 500); // Save after 500ms of no changes
 }

 private convertMarginUnits(
 fromUnit: "inches" | "centimeters",
 toUnit: "inches" | "centimeters",
 ): void {
 if (fromUnit === toUnit) return;

 // Use UnitConverter for consistent conversion
 const fromUnitType = fromUnit === "inches" ? "inches" : "cm";
 const toUnitType = toUnit === "inches" ? "inches" : "cm";

 // Convert margin settings to compatible format
 const marginsForConversion = {
   top: this.currentSettings.top,
   right: this.currentSettings.right,
   bottom: this.currentSettings.bottom,
   left: this.currentSettings.left,
   unit: fromUnitType as any
 };

 const converted = UnitConverter.convertMargins(
   marginsForConversion,
   fromUnitType,
   toUnitType
 );

 this.currentSettings.top = UnitConverter.roundForUnit(converted.top, toUnitType);
 this.currentSettings.bottom = UnitConverter.roundForUnit(converted.bottom, toUnitType);
 this.currentSettings.left = UnitConverter.roundForUnit(converted.left, toUnitType);
 this.currentSettings.right = UnitConverter.roundForUnit(converted.right, toUnitType);

 console.log(
 `📏 Converted margins from ${fromUnit} to ${toUnit}:`,
 this.currentSettings,
 );
 }

 private updateInputValues(): void {
 const topInput = document.getElementById("margin-top") as HTMLInputElement;
 const bottomInput = document.getElementById(
 "margin-bottom",
 ) as HTMLInputElement;
 const leftInput = document.getElementById(
 "margin-left",
 ) as HTMLInputElement;
 const rightInput = document.getElementById(
 "margin-right",
 ) as HTMLInputElement;

 if (topInput) topInput.value = this.currentSettings.top.toString();
 if (bottomInput) bottomInput.value = this.currentSettings.bottom.toString();
 if (leftInput) leftInput.value = this.currentSettings.left.toString();
 if (rightInput) rightInput.value = this.currentSettings.right.toString();
 }

 private updateUnitDisplays(): void {
 const unitDisplays = document.querySelectorAll('.unit-display');
 const displayUnit = this.currentSettings.unit === "inches" ? "in" : "cm";

 unitDisplays.forEach((display) => {
 display.textContent = displayUnit;
 });
 }

 private async saveSettingsToDatabase(): Promise<void> {
 if (!this.courseId) {
 console.error(
 "📏 ERROR: No course ID available, cannot save margin settings",
 );
 return;
 }

 try {
 console.log(
 "📏 Saving margin settings to database...",
 this.currentSettings,
 );

 // Get current course settings
 const { data: course, error: fetchError } = await supabase
 .from("courses")
 .select("course_settings")
 .eq("id", this.courseId)
 .single();

 if (fetchError) {
 throw fetchError;
 }

 // Merge with existing settings
 const existingSettings = course?.course_settings || {};
 const updatedSettings = {
 ...existingSettings,
 margins: this.currentSettings,
 };

 // Save to database
 const { error } = await supabase
 .from("courses")
 .update({ course_settings: updatedSettings })
 .eq("id", this.courseId);

 if (error) {
 throw error;
 }

 this.showSaveStatus("saved");
 } catch (error) {
 console.error("📏 Failed to save margin settings:", error);
 this.showSaveStatus("error");
 }
 }

 private showSaveStatus(status: "saving" | "saved" | "error"): void {
 const statusElement = document.querySelector(
      "#margins-save-status .card__text",
 ) as HTMLElement;
 if (!statusElement) return;

 // Remove existing status classes
 statusElement

 switch (status) {
 case "saving":
 statusElement.textContent = "Saving margins...";
 statusElement
 break;
 case "saved":
 statusElement.textContent = "Margins saved successfully";
 statusElement
 // Reset to default message after 3 seconds
 setTimeout(() => {
 statusElement.textContent = "Margins will be saved automatically";
 statusElement
 }, 3000);
 break;
 case "error":
 statusElement.textContent = "Failed to save margins";
 statusElement
 // Reset to default message after 5 seconds
 setTimeout(() => {
 statusElement.textContent = "Margins will be saved automatically";
 statusElement
 }, 5000);
 break;
 }
 }

 public async loadSettingsFromDatabase(courseId: string): Promise<void> {
 this.courseId = courseId;

 try {

 const { data: course, error } = await supabase
 .from("courses")
 .select("course_settings")
 .eq("id", courseId)
 .single();

 if (error) {
 console.error("📏 Error loading course settings:", error);
 // Use defaults if loading fails
 this.updateInputValues();
 this.updateUnitDisplays();
 this.updateCanvasMargins();
 return;
 }

 if (course?.course_settings?.margins) {
 const margins = course.course_settings.margins;
 this.currentSettings = { ...this.currentSettings, ...margins };
 console.log(
 "📏 Loaded margin settings from database:",
 this.currentSettings,
 );
 } else {
  
 }

 // Update UI and canvas
 this.updateInputValues();
 this.updateUnitDisplays();
 this.updateCanvasMargins();
 } catch (error) {
 console.error("📏 Error loading margin settings:", error);
 // Use defaults if loading fails
 this.updateInputValues();
 this.updateUnitDisplays();
 this.updateCanvasMargins();
 }
 }

 private updateCanvasMargins(): void {
 // This will communicate with the course builder to update canvas margins
 if (
 this.courseBuilder &&
 typeof this.courseBuilder.updateCanvasMargins === "function"
 ) {
 // Use UnitConverter for consistent pixel conversion
 const marginsInPixels = this.getMarginPixels();

 this.courseBuilder.updateCanvasMargins(marginsInPixels);
 } else {
 console.log(
 "📏 Course builder not available yet, margins will be applied when canvas is ready",
 );
 }
 }

 public setCourseBuilder(courseBuilder: any): void {
 this.courseBuilder = courseBuilder;
 // Apply current margins immediately
 this.updateCanvasMargins();
 }

 /**
 * Set course ID and load settings from database
 */
 public setCourseId(courseId: string): void {
 this.courseId = courseId;
 this.loadSettingsFromDatabase(courseId);
 }

 public getCurrentSettings(): MarginSettings {
 return { ...this.currentSettings };
 }

 /**
 * Force save current settings to database (used for manual save operations)
 */
 public async forceSaveToDatabase(): Promise<void> {
 if (this.courseId) {
 await this.saveSettingsToDatabase();
 }
 }

 public getMarginPixels(): {
 top: number;
 bottom: number;
 left: number;
 right: number;
 } {
 // Use UnitConverter for consistent pixel conversion
 const unitType = this.currentSettings.unit === "inches" ? "inches" : "cm";
 const marginsForConversion = {
   top: this.currentSettings.top,
   right: this.currentSettings.right,
   bottom: this.currentSettings.bottom,
   left: this.currentSettings.left,
   unit: unitType as any
 };

 const pixelMargins = UnitConverter.marginsToPixels(marginsForConversion);
 
 return {
   top: pixelMargins.top,
   bottom: pixelMargins.bottom,
   left: pixelMargins.left,
   right: pixelMargins.right
 };
 }

 public destroy(): void {
 if (this.saveTimeout) {
 clearTimeout(this.saveTimeout);
 }
 }
}

// Export singleton instance
export const marginSettingsHandler = new MarginSettingsHandler();
