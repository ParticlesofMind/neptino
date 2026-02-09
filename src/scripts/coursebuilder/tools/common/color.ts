/**
 * Expand a 3-character hex shorthand to 6 characters.
 * e.g. "F0A" → "FF00AA"
 */
const expandHex = (hex: string): string => {
  if (hex.length === 3) {
    return hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return hex;
};

export const hexToNumber = (value: unknown, fallback = 0x000000): number => {
  if (typeof value !== "string") {
    return fallback;
  }
  const raw = value.trim().replace(/^#/, "");
  const hex = expandHex(raw);
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return fallback;
  }
  return Number.parseInt(hex, 16);
};

export const normalizeHex = (value: unknown, fallback = "#000000"): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  const raw = value.trim().replace(/^#/, "");
  const hex = expandHex(raw);
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return fallback;
  }
  return `#${hex.toUpperCase()}`;
};
