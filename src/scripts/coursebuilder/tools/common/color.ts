export const hexToNumber = (value: unknown, fallback = 0x000000): number => {
  if (typeof value !== "string") {
    return fallback;
  }
  const hex = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return fallback;
  }
  return Number.parseInt(hex, 16);
};

export const normalizeHex = (value: unknown, fallback = "#000000"): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  const hex = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return fallback;
  }
  return `#${hex.toUpperCase()}`;
};
