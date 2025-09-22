/**
 * Unit Converter Utility
 * Consolidates all DPI and unit conversion logic
 * Single source of truth for margin/dimension conversions
 */

import { MarginSettings, UnitType } from '../types/canvas';

export class UnitConverter {
  // Standard web DPI - consistent across all conversions
  private static readonly DPI = 96;
  
  // Conversion factors to inches
  private static readonly CONVERSION_FACTORS = {
    inches: 1,
    cm: 1 / 2.54,
    mm: 1 / 25.4,
    px: 1 / UnitConverter.DPI
  } as const;

  /**
   * Convert a value from any unit to pixels
   */
  static toPixels(value: number, unit: UnitType): number {
    if (unit === 'px') {
      return value;
    }
    
    const factor = UnitConverter.CONVERSION_FACTORS[unit];
    if (!factor) {
      throw new Error(`Unsupported unit: ${unit}`);
    }
    
    // Convert to inches first, then to pixels
    const inches = value * factor;
    return inches * UnitConverter.DPI;
  }

  /**
   * Convert a value from pixels to any unit
   */
  static fromPixels(pixelValue: number, targetUnit: UnitType): number {
    if (targetUnit === 'px') {
      return pixelValue;
    }
    
    const factor = UnitConverter.CONVERSION_FACTORS[targetUnit];
    if (!factor) {
      throw new Error(`Unsupported unit: ${targetUnit}`);
    }
    
    // Convert to inches first, then to target unit
    const inches = pixelValue / UnitConverter.DPI;
    return inches / factor;
  }

  /**
   * Convert margin settings to pixels
   * Handles both unit-based margins and pixel margins
   */
  static marginsToPixels(margins: MarginSettings): Required<MarginSettings> {
    // If no unit specified, assume already in pixels
    const unit: UnitType = margins.unit || 'px';
    
    return {
      top: UnitConverter.toPixels(margins.top, unit),
      right: UnitConverter.toPixels(margins.right, unit),
      bottom: UnitConverter.toPixels(margins.bottom, unit),
      left: UnitConverter.toPixels(margins.left, unit),
      unit: 'px'
    };
  }

  /**
   * Convert pixel margins to specified unit
   */
  static marginsFromPixels(pixelMargins: MarginSettings, targetUnit: UnitType): Required<MarginSettings> {
    return {
      top: UnitConverter.fromPixels(pixelMargins.top, targetUnit),
      right: UnitConverter.fromPixels(pixelMargins.right, targetUnit),
      bottom: UnitConverter.fromPixels(pixelMargins.bottom, targetUnit),
      left: UnitConverter.fromPixels(pixelMargins.left, targetUnit),
      unit: targetUnit
    };
  }

  /**
   * Convert margins between any two units
   */
  static convertMargins(margins: MarginSettings, fromUnit: UnitType, toUnit: UnitType): Required<MarginSettings> {
    if (fromUnit === toUnit) {
      return { ...margins, unit: toUnit };
    }

    return {
      top: UnitConverter.fromPixels(UnitConverter.toPixels(margins.top, fromUnit), toUnit),
      right: UnitConverter.fromPixels(UnitConverter.toPixels(margins.right, fromUnit), toUnit),
      bottom: UnitConverter.fromPixels(UnitConverter.toPixels(margins.bottom, fromUnit), toUnit),
      left: UnitConverter.fromPixels(UnitConverter.toPixels(margins.left, fromUnit), toUnit),
      unit: toUnit
    };
  }

  /**
   * Get the DPI constant used for conversions
   */
  static getDPI(): number {
    return UnitConverter.DPI;
  }

  /**
   * Validate that a unit is supported
   */
  static isValidUnit(unit: string): unit is UnitType {
    return unit in UnitConverter.CONVERSION_FACTORS;
  }

  /**
   * Round to appropriate precision for the unit
   */
  static roundForUnit(value: number, unit: UnitType): number {
    switch (unit) {
      case 'px':
        return Math.round(value);
      case 'inches':
        return Math.round(value * 100) / 100; // 2 decimal places
      case 'cm':
        return Math.round(value * 100) / 100; // 2 decimal places
      case 'mm':
        return Math.round(value * 10) / 10;   // 1 decimal place
      default:
        return value;
    }
  }
}