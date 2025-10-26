import { TEMPLATE_TYPE_LABELS } from "../../templates/templateOptions.js";

export class HtmlHelpers {
  /**
   * Escape HTML special characters
   */
  static escape(value: string): string {
    if (!value) {
      return "";
    }

    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return value.replace(/[&<>"']/g, (char) => replacements[char] || char);
  }

  /**
   * Format template type for display
   */
  static formatTemplateType(type: string | null | undefined): string {
    if (!type || typeof type !== "string") {
      return "Template";
    }

    const normalized = type.trim().toLowerCase();
    if (!normalized.length) {
      return "Template";
    }

    if (Object.prototype.hasOwnProperty.call(TEMPLATE_TYPE_LABELS, normalized)) {
      return TEMPLATE_TYPE_LABELS[
        normalized as keyof typeof TEMPLATE_TYPE_LABELS
      ];
    }

    const humanized = normalized
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    return humanized || "Template";
  }
}

