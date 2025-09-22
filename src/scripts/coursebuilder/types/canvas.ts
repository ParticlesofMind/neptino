/**
 * Shared Canvas Types
 * Central type definitions for canvas-related interfaces
 */

export interface CanvasBounds {
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface MarginSettings {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit?: UnitType; // Optional for pixel margins
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export type UnitType = 'inches' | 'cm' | 'mm' | 'px';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}