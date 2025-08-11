/**
 * Margin Settings Handler
 * Handles margin settings UI and database persistence for course canvas
 */

import { supabase } from '../../backend/supabase';

export interface MarginSettings {
  top: number;
  bottom: number;
  left: number;
  right: number;
  unit: 'inches' | 'centimeters';
}

export class MarginSettingsHandler {
  private courseId: string | null = null;
  private currentSettings: MarginSettings;
  private saveTimeout: NodeJS.Timeout | null = null;
  private courseBuilder: any = null; // Will be set when course builder is available

  constructor() {
    // Default values in centimeters
    this.currentSettings = {
      top: 2.54,
      bottom: 2.54,
      left: 2.54,
      right: 2.54,
      unit: 'centimeters'
    };

    this.init();
  }

  private init(): void {
    this.bindEvents();
    this.updateUnitDisplays();
    this.updateInputValues(); // Ensure UI shows default values
    console.log('📏 Margin Settings Handler initialized with defaults:', this.currentSettings);
  }

  private bindEvents(): void {
    // Unit toggle events
    const unitInputs = document.querySelectorAll('input[name="margin-unit"]');
    unitInputs.forEach(input => {
      input.addEventListener('change', (e) => this.handleUnitChange(e));
    });

    // Margin input events
    const marginInputs = document.querySelectorAll('.margin-input');
    marginInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handleMarginChange(e));
      input.addEventListener('change', (e) => this.handleMarginChange(e)); // For when user leaves field
    });
  }

  private handleUnitChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newUnit = input.value as 'inches' | 'centimeters';
    
    console.log(`📏 Unit changed to: ${newUnit}`);
    
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
    const marginType = input.name.replace('margin_', '') as keyof Omit<MarginSettings, 'unit'>;
    const value = parseFloat(input.value) || 0;
    
    console.log(`📏 Margin ${marginType} changed to: ${value} ${this.currentSettings.unit}`);
    
    // Update current settings
    this.currentSettings[marginType] = value;
    
    // Show saving status
    this.showSaveStatus('saving');
    
    // Debounce saving to database
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveSettingsToDatabase();
      this.updateCanvasMargins();
    }, 500); // Save after 500ms of no changes
  }

  private convertMarginUnits(fromUnit: 'inches' | 'centimeters', toUnit: 'inches' | 'centimeters'): void {
    if (fromUnit === toUnit) return;
    
    const conversionFactor = fromUnit === 'inches' ? 2.54 : 1 / 2.54; // inches to cm or cm to inches
    
    this.currentSettings.top = parseFloat((this.currentSettings.top * conversionFactor).toFixed(2));
    this.currentSettings.bottom = parseFloat((this.currentSettings.bottom * conversionFactor).toFixed(2));
    this.currentSettings.left = parseFloat((this.currentSettings.left * conversionFactor).toFixed(2));
    this.currentSettings.right = parseFloat((this.currentSettings.right * conversionFactor).toFixed(2));
    
    console.log(`📏 Converted margins from ${fromUnit} to ${toUnit}:`, this.currentSettings);
  }

  private updateInputValues(): void {
    const topInput = document.getElementById('margin-top') as HTMLInputElement;
    const bottomInput = document.getElementById('margin-bottom') as HTMLInputElement;
    const leftInput = document.getElementById('margin-left') as HTMLInputElement;
    const rightInput = document.getElementById('margin-right') as HTMLInputElement;
    
    if (topInput) topInput.value = this.currentSettings.top.toString();
    if (bottomInput) bottomInput.value = this.currentSettings.bottom.toString();
    if (leftInput) leftInput.value = this.currentSettings.left.toString();
    if (rightInput) rightInput.value = this.currentSettings.right.toString();
  }

  private updateUnitDisplays(): void {
    const unitDisplays = document.querySelectorAll('.margin-unit-display');
    const displayUnit = this.currentSettings.unit === 'inches' ? 'in' : 'cm';
    
    unitDisplays.forEach(display => {
      display.textContent = displayUnit;
    });
  }

  private async saveSettingsToDatabase(): Promise<void> {
    if (!this.courseId) {
      console.warn('📏 No course ID available, cannot save margin settings');
      this.showSaveStatus('error');
      return;
    }

    // Check if this is a demo course (not a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(this.courseId)) {
      console.log('📏 Demo mode detected - settings saved locally only');
      this.showSaveStatus('saved');
      return;
    }

    try {
      console.log('📏 Saving margin settings to database...', this.currentSettings);
      
      // Get current course settings
      const { data: course, error: fetchError } = await supabase
        .from('courses')
        .select('course_settings')
        .eq('id', this.courseId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Merge with existing settings
      const existingSettings = course?.course_settings || {};
      const updatedSettings = {
        ...existingSettings,
        margins: this.currentSettings
      };

      // Save to database
      const { error } = await supabase
        .from('courses')
        .update({ course_settings: updatedSettings })
        .eq('id', this.courseId);

      if (error) {
        throw error;
      }

      console.log('📏 Margin settings saved successfully');
      this.showSaveStatus('saved');
      
    } catch (error) {
      console.error('📏 Failed to save margin settings:', error);
      this.showSaveStatus('error');
    }
  }

  private showSaveStatus(status: 'saving' | 'saved' | 'error'): void {
    const statusElement = document.querySelector('#margins-save-status .save-indicator__text') as HTMLElement;
    if (!statusElement) return;

    // Remove existing status classes
    statusElement.classList.remove('saved', 'saving', 'error');
    
    switch (status) {
      case 'saving':
        statusElement.textContent = 'Saving margins...';
        statusElement.classList.add('saving');
        break;
      case 'saved':
        statusElement.textContent = 'Margins saved successfully';
        statusElement.classList.add('saved');
        // Reset to default message after 3 seconds
        setTimeout(() => {
          statusElement.textContent = 'Margins will be saved automatically';
          statusElement.classList.remove('saved');
        }, 3000);
        break;
      case 'error':
        statusElement.textContent = 'Failed to save margins';
        statusElement.classList.add('error');
        // Reset to default message after 5 seconds
        setTimeout(() => {
          statusElement.textContent = 'Margins will be saved automatically';
          statusElement.classList.remove('error');
        }, 5000);
        break;
    }
  }

  public async loadSettingsFromDatabase(courseId: string): Promise<void> {
    this.courseId = courseId;
    
    // Check if this is a demo course (not a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(courseId)) {
      console.log('📏 Demo mode detected - using default margin settings');
      // Use default settings for demo and apply to canvas immediately
      this.updateInputValues();
      this.updateUnitDisplays();
      this.updateCanvasMargins();
      return;
    }
    
    try {
      console.log(`📏 Loading margin settings for course: ${courseId}`);
      
      const { data: course, error } = await supabase
        .from('courses')
        .select('course_settings')
        .eq('id', courseId)
        .single();

      if (error) {
        throw error;
      }

      // Extract margin settings - they should always exist due to database defaults
      const courseSettings = course?.course_settings || {};
      if (courseSettings.margins) {
        this.currentSettings = { ...courseSettings.margins };
      }
      
      // Update UI with loaded settings
      this.updateInputValues();
      this.updateUnitDisplays();
      
      // Update unit radio button
      const unitInput = document.querySelector(`input[value="${this.currentSettings.unit}"]`) as HTMLInputElement;
      if (unitInput) {
        unitInput.checked = true;
      }
      
      console.log('📏 Margin settings loaded from database:', this.currentSettings);
      
      // Update canvas with loaded margins
      this.updateCanvasMargins();
      
    } catch (error) {
      console.error('📏 Failed to load margin settings:', error);
      // Use defaults if loading fails
      this.updateInputValues();
      this.updateUnitDisplays();
      this.updateCanvasMargins();
    }
  }

  private updateCanvasMargins(): void {
    // This will communicate with the course builder to update canvas margins
    if (this.courseBuilder && typeof this.courseBuilder.updateCanvasMargins === 'function') {
      // Convert to pixels (assuming 96 DPI)
      const dpi = 96;
      const marginsInPixels = {
        top: this.currentSettings.unit === 'inches' 
          ? this.currentSettings.top * dpi 
          : (this.currentSettings.top / 2.54) * dpi,
        bottom: this.currentSettings.unit === 'inches' 
          ? this.currentSettings.bottom * dpi 
          : (this.currentSettings.bottom / 2.54) * dpi,
        left: this.currentSettings.unit === 'inches' 
          ? this.currentSettings.left * dpi 
          : (this.currentSettings.left / 2.54) * dpi,
        right: this.currentSettings.unit === 'inches' 
          ? this.currentSettings.right * dpi 
          : (this.currentSettings.right / 2.54) * dpi,
      };
      
      console.log('📏 Updating canvas margins:', marginsInPixels);
      this.courseBuilder.updateCanvasMargins(marginsInPixels);
    } else {
      console.log('📏 Course builder not available yet, margins will be applied when canvas is ready');
    }
  }

  public setCourseBuilder(courseBuilder: any): void {
    this.courseBuilder = courseBuilder;
    console.log('📏 Course builder reference set');
    // Apply current margins immediately
    this.updateCanvasMargins();
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

  public getMarginPixels(): { top: number; bottom: number; left: number; right: number } {
    const dpi = 96;
    return {
      top: this.currentSettings.unit === 'inches' 
        ? this.currentSettings.top * dpi 
        : (this.currentSettings.top / 2.54) * dpi,
      bottom: this.currentSettings.unit === 'inches' 
        ? this.currentSettings.bottom * dpi 
        : (this.currentSettings.bottom / 2.54) * dpi,
      left: this.currentSettings.unit === 'inches' 
        ? this.currentSettings.left * dpi 
        : (this.currentSettings.left / 2.54) * dpi,
      right: this.currentSettings.unit === 'inches' 
        ? this.currentSettings.right * dpi 
        : (this.currentSettings.right / 2.54) * dpi,
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
