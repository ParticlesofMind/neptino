/**
 * Page Setup Handler
 * Handles complete page setup including margins, orientation, and canvas size
 */

import { supabase } from "../../supabase";
import { canvasMarginManager } from "../../../coursebuilder/layout/CanvasMarginManager";
import { canvasDimensionManager } from "../../../coursebuilder/layout/CanvasDimensionManager";

export interface PageLayoutSettings {
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    unit: "mm" | "cm" | "inches";
  };
  orientation: "portrait" | "landscape";
  canvas_size: "a4" | "us-letter" | "a3";
}

export class PageSetupHandler {
  private static readonly DEFAULT_MARGINS_MM = {
    top: 33.87,
    bottom: 29.63,
    left: 25.4,
    right: 25.4,
    unit: "mm" as const,
  };
  private courseId: string | null = null;
  private currentSettings: PageLayoutSettings;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Default values stored in millimeters (aligns with database format)
    this.currentSettings = {
      margins: { ...PageSetupHandler.DEFAULT_MARGINS_MM },
      orientation: "portrait",
      canvas_size: "a4",
    };

    this.init();
  }

  private convertMarginToMillimeters(
    value: unknown,
    unit: "mm" | "cm" | "inches",
  ): number | undefined {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return undefined;
    }

    switch (unit) {
      case "cm":
        return value * 10;
      case "inches":
        return value * 25.4;
      default:
        return value;
    }
  }

  private roundMargin(value: number | undefined): number {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return 0;
    }
    return Math.round(value * 100) / 100;
  }


  private init(): void {
    this.bindEvents();
    this.updateUI();

    // Initialize canvas + margin managers with default layout
    this.syncCanvasSystems();
  }

  private bindEvents(): void {
    // Orientation radio buttons
    document.querySelectorAll('input[name="orientation"]').forEach(input => {
      input.addEventListener('change', this.handleOrientationChange.bind(this));
    });

    // Canvas size radio buttons
    document.querySelectorAll('input[name="canvas-size"]').forEach(input => {
      input.addEventListener('change', this.handleCanvasSizeChange.bind(this));
    });

    // Units radio buttons (updated field name)
    document.querySelectorAll('input[name="units"]').forEach(input => {
      input.addEventListener('change', this.handleUnitsChange.bind(this));
    });

    // Margin inputs
    (['margin_top', 'margin_bottom', 'margin_left', 'margin_right'] as const).forEach(name => {
      const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
      if (input) {
        input.addEventListener('input', this.handleMarginChange.bind(this));
        
        // Ensure proper step behavior for increment/decrement
        input.addEventListener('keydown', this.handleMarginKeydown.bind(this));
        
        // Also handle mouse wheel for precision
        input.addEventListener('wheel', this.handleMarginWheel.bind(this), { passive: false });
      }
    });
  }

  private handleUnitsChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newUnit = input.value as "mm" | "cm" | "inches";
    const oldUnit = this.currentSettings.margins.unit;

    if (newUnit !== oldUnit) {
      
      // Convert existing margin values
      this.convertMarginUnits(oldUnit, newUnit);
      
      // Update the unit in settings
      this.currentSettings.margins.unit = newUnit;
      
      // Update UI
      this.updateUI();
      this.debouncedSave();
      this.updatePreview();
    }
  }

  private convertMarginUnits(fromUnit: "mm" | "cm" | "inches", toUnit: "mm" | "cm" | "inches"): void {
    if (fromUnit === toUnit) return;
    
    // First convert from source unit to mm (base unit)
    const marginsInMm = {
      top: this.currentSettings.margins.top,
      bottom: this.currentSettings.margins.bottom,
      left: this.currentSettings.margins.left,
      right: this.currentSettings.margins.right
    };

    if (fromUnit === "cm") {
      Object.keys(marginsInMm).forEach(key => {
        marginsInMm[key as keyof typeof marginsInMm] *= 10; // cm to mm
      });
    } else if (fromUnit === "inches") {
      Object.keys(marginsInMm).forEach(key => {
        marginsInMm[key as keyof typeof marginsInMm] *= 25.4; // inches to mm
      });
    }
    // If fromUnit is mm, no conversion needed

    // Then convert from mm to target unit
    if (toUnit === "cm") {
      Object.keys(marginsInMm).forEach(key => {
        marginsInMm[key as keyof typeof marginsInMm] /= 10; // mm to cm
      });
    } else if (toUnit === "inches") {
      Object.keys(marginsInMm).forEach(key => {
        marginsInMm[key as keyof typeof marginsInMm] /= 25.4; // mm to inches
      });
    }
    // If toUnit is mm, no conversion needed

    // Apply converted values with appropriate precision
    // Use 3 decimal places for all units to ensure hundredth precision
    const precision = 3; // Increased from variable precision for consistency
    this.currentSettings.margins.top = parseFloat(marginsInMm.top.toFixed(precision));
    this.currentSettings.margins.bottom = parseFloat(marginsInMm.bottom.toFixed(precision));
    this.currentSettings.margins.left = parseFloat(marginsInMm.left.toFixed(precision));
    this.currentSettings.margins.right = parseFloat(marginsInMm.right.toFixed(precision));

  }

  private handleOrientationChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.currentSettings.orientation = input.value as "portrait" | "landscape";
    this.debouncedSave();
    this.updatePreview();
  }

  private handleCanvasSizeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.currentSettings.canvas_size = input.value as "a4" | "us-letter" | "a3";
    this.debouncedSave();
    this.updatePreview();
  }

  private handleMarginChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const marginType = input.name.split('_')[1] as keyof typeof this.currentSettings.margins;
    
    if (marginType && marginType !== 'unit') {
      const value = parseFloat(input.value) || 0;
      this.currentSettings.margins[marginType] = value;
      this.debouncedSave();
      this.updatePreview();
    }
  }

  private handleMarginKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    
    // Handle up and down arrow keys for precise increments
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      
      const currentValue = parseFloat(input.value) || 0;
      const step = 0.01; // Always use 0.01 step for hundredths precision
      const increment = event.key === 'ArrowUp' ? step : -step;
      const newValue = Math.max(0, Math.min(100, currentValue + increment));
      
      // Round to avoid floating point precision issues
      const roundedValue = Math.round(newValue * 100) / 100;
      
      input.value = roundedValue.toFixed(2);
      
      // Trigger the input event to update the settings
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  private handleMarginWheel(event: WheelEvent): void {
    const input = event.target as HTMLInputElement;
    
    // Only handle wheel events when the input is focused
    if (document.activeElement !== input) return;
    
    event.preventDefault();
    
    const currentValue = parseFloat(input.value) || 0;
    const step = 0.01; // Always use 0.01 step for hundredths precision
    const increment = event.deltaY < 0 ? step : -step;
    const newValue = Math.max(0, Math.min(100, currentValue + increment));
    
    // Round to avoid floating point precision issues
    const roundedValue = Math.round(newValue * 100) / 100;
    
    input.value = roundedValue.toFixed(2);
    
    // Trigger the input event to update the settings
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private debouncedSave(): void {
    this.showSaveStatus("saving");
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveSettingsToDatabase();
    }, 500);
  }

  private updateUI(): void {
    // Update units radio buttons (updated field name)
    const unitsRadio = document.querySelector(`input[name="units"][value="${this.currentSettings.margins.unit}"]`) as HTMLInputElement;
    if (unitsRadio) unitsRadio.checked = true;

    // Update orientation radio buttons
    const orientationRadio = document.querySelector(`input[name="orientation"][value="${this.currentSettings.orientation}"]`) as HTMLInputElement;
    if (orientationRadio) orientationRadio.checked = true;

    // Update canvas size radio buttons
    const canvasSizeRadio = document.querySelector(`input[name="canvas-size"][value="${this.currentSettings.canvas_size}"]`) as HTMLInputElement;
    if (canvasSizeRadio) canvasSizeRadio.checked = true;

    // Update margin inputs
    const marginInputs = {
      margin_top: this.currentSettings.margins.top,
      margin_bottom: this.currentSettings.margins.bottom,
      margin_left: this.currentSettings.margins.left,
      margin_right: this.currentSettings.margins.right
    };

    Object.entries(marginInputs).forEach(([name, value]) => {
      const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
      if (input) input.value = value.toString();
    });

    // Update unit display labels
    this.updateUnitDisplays();
    
    // Update canvas size labels
    this.updateCanvasSizeLabels();

    // Update input step and limits based on unit
    this.updateInputConstraints();

    this.updatePreview();
  }

  private updateUnitDisplays(): void {
    const unit = this.currentSettings.margins.unit;
    const displayUnit = unit === "inches" ? "in" : unit;
    
    document.querySelectorAll('.page-setup__unit').forEach(element => {
      element.textContent = displayUnit;
    });
  }

  private updateCanvasSizeLabels(): void {
    const unit = this.currentSettings.margins.unit;
    
    document.querySelectorAll('.canvas-size-label').forEach(element => {
      const label = element as HTMLElement;
      if (unit === "inches") {
        label.textContent = label.getAttribute('data-inches') || '';
      } else {
        // Default to cm for metric units
        label.textContent = label.getAttribute('data-cm') || '';
      }
    });
  }

  private updateInputConstraints(): void {
    const unit = this.currentSettings.margins.unit;
    let step = "0.01";
    let max = "100";
    
    // Adjust step and max values based on unit
    if (unit === "inches") {
      step = "0.01"; // Allow hundredths of an inch
      max = "4"; // 4 inches max (about 100mm)
    } else if (unit === "cm") {
      step = "0.1"; // Allow tenths of a cm
      max = "10"; // 10 cm max
    } else { // mm
      step = "0.1"; // Tenths of a mm keeps inputs manageable
      max = "120"; // Allow up to 12 cm margins
    }

    // Update all margin inputs
    ['margin_top', 'margin_bottom', 'margin_left', 'margin_right'].forEach(name => {
      const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
      if (input) {
        input.step = step;
        input.max = max;
      }
    });
  }

  private updatePreview(): void {
    // Update canvas margin manager with current settings  
    this.syncCanvasSystems();

    // Trigger the canvas preview update if it exists
    const event = new CustomEvent('pageLayoutChange', {
      detail: this.currentSettings
    });
    document.dispatchEvent(event);
  }

  private async saveSettingsToDatabase(): Promise<void> {
    if (!this.courseId) {
      console.error("📄 ERROR: No course ID available, cannot save page layout settings");
      this.showSaveStatus("error");
      return;
    }

    try {

      const { error } = await supabase
        .from("courses")
        .update({ course_layout: this.currentSettings })
        .eq("id", this.courseId);

      if (error) {
        throw error;
      }

      this.showSaveStatus("saved");
    } catch (error) {
      console.error("📄 Failed to save page layout settings:", error);
      this.showSaveStatus("error");
    }
  }

  private showSaveStatus(status: "saving" | "saved" | "error"): void {
    // You can implement a save status indicator here if needed
    void status;
  }

  public async loadSettingsFromDatabase(courseId: string): Promise<void> {
    this.courseId = courseId;

    try {

      const { data: course, error } = await supabase
        .from("courses")
        .select("course_layout")
        .eq("id", courseId)
        .single();

      if (error) {
        console.error("📄 Error loading course layout:", error);
        this.updateUI();
        return;
      }

      let shouldPersistDefaults = false;

      if (course?.course_layout) {
        const incoming = course.course_layout;
        const incomingMargins = incoming.margins || {};
        const unit = (incomingMargins.unit as "mm" | "cm" | "inches" | undefined) ?? "mm";

        const topMm = this.convertMarginToMillimeters(incomingMargins.top, unit);
        const bottomMm = this.convertMarginToMillimeters(incomingMargins.bottom, unit);
        const leftMm = this.convertMarginToMillimeters(incomingMargins.left, unit);
        const rightMm = this.convertMarginToMillimeters(incomingMargins.right, unit);

        const hasInvalidMargins =
          topMm === undefined ||
          bottomMm === undefined ||
          leftMm === undefined ||
          rightMm === undefined;

        this.currentSettings = {
          margins: hasInvalidMargins
            ? { ...PageSetupHandler.DEFAULT_MARGINS_MM }
            : {
                top: this.roundMargin(topMm),
                bottom: this.roundMargin(bottomMm),
                left: this.roundMargin(leftMm),
                right: this.roundMargin(rightMm),
                unit: "mm",
              },
          orientation: incoming.orientation || this.currentSettings.orientation,
          canvas_size: incoming.canvas_size || this.currentSettings.canvas_size,
        };

        if (hasInvalidMargins || unit !== "mm") {
          shouldPersistDefaults = true;
        }
      } else {
        shouldPersistDefaults = true;
      }

      console.log("📄 PageSetupHandler: Loaded settings from database:", this.currentSettings);
      this.syncCanvasSystems();
      this.updateUI();

      if (shouldPersistDefaults) {
        await this.forceSaveToDatabase();
      }
    } catch (error) {
      console.error("📄 Error loading page layout settings:", error);
      this.updateUI();
    }
  }

  public setCourseId(courseId: string): void {
    this.courseId = courseId;
    this.loadSettingsFromDatabase(courseId);
  }

  public getCurrentSettings(): PageLayoutSettings {
    return { ...this.currentSettings };
  }

  public async forceSaveToDatabase(): Promise<void> {
    if (this.courseId) {
      await this.saveSettingsToDatabase();
    }
  }

  public destroy(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  }

  private syncCanvasSystems(): void {
    console.log("📄 PageSetupHandler: Syncing canvas systems with settings:", this.currentSettings);
    canvasDimensionManager.applyPageLayout({
      canvas_size: this.currentSettings.canvas_size,
      orientation: this.currentSettings.orientation,
    });
    canvasMarginManager.setMarginsFromPageLayout(this.currentSettings);
  }
}

// Export singleton instance
export const pageSetupHandler = new PageSetupHandler();
