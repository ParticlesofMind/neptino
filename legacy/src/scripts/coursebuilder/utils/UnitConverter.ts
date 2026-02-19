/**
 * UnitConverter - minimal unit conversion helpers for canvas tooling.
 * Supports conversions between inches, centimeters, millimeters, and pixels.
 */

type SupportedUnit = "inches" | "cm" | "mm" | "px";

export interface MarginValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit?: SupportedUnit;
}

const UNIT_TO_MM: Record<SupportedUnit, number> = {
  mm: 1,
  cm: 10,
  inches: 25.4,
  px: 25.4 / 96, // 96 CSS pixels per inch
};

export class UnitConverter {
  /**
   * Convert a numeric value between two units.
   */
  static convertValue(value: number, from: SupportedUnit, to: SupportedUnit): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    if (from === to) {
      return value;
    }

    const valueInMm = value * UNIT_TO_MM[from];
    return valueInMm / UNIT_TO_MM[to];
  }

  /**
   * Convert a set of margins from one unit to another.
   */
  static convertMargins(
    margins: MarginValues,
    from: SupportedUnit,
    to: SupportedUnit,
  ): MarginValues {
    return {
      top: UnitConverter.convertValue(margins.top, from, to),
      right: UnitConverter.convertValue(margins.right, from, to),
      bottom: UnitConverter.convertValue(margins.bottom, from, to),
      left: UnitConverter.convertValue(margins.left, from, to),
      unit: to,
    };
  }

  /**
   * Convert incoming margins (with an embedded unit) to pixels.
   */
  static marginsToPixels(margins: MarginValues): MarginValues {
    const fromUnit: SupportedUnit = margins.unit ?? "px";
    return UnitConverter.convertMargins(margins, fromUnit, "px");
  }

  /**
   * Convert incoming margins (with an embedded unit) to centimeters.
   */
  static marginsToCentimeters(margins: MarginValues): MarginValues {
    const fromUnit: SupportedUnit = margins.unit ?? "cm";
    return UnitConverter.convertMargins(margins, fromUnit, "cm");
  }

  /**
   * Round a value to a sensible precision for the requested unit.
   */
  static roundForUnit(value: number, unit: SupportedUnit): number {
    const precision = unit === "inches" ? 2 : unit === "px" ? 0 : 2;
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  /**
   * Convenience helper for cloning margin objects.
   */
  static cloneMargins(margins: MarginValues): MarginValues {
    return {
      top: margins.top,
      right: margins.right,
      bottom: margins.bottom,
      left: margins.left,
      unit: margins.unit,
    };
  }
}

export default UnitConverter;
