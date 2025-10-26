export class TemplateAccentHelper {
  private static readonly PALETTE: string[] = [
    "template-accent--sky",
    "template-accent--violet",
    "template-accent--amber",
    "template-accent--teal",
    "template-accent--rose",
    "template-accent--slate",
    "template-accent--cobalt",
    "template-accent--mint",
    "template-accent--sunset",
    "template-accent--gold",
  ];

  private static readonly BY_TYPE: Record<string, string> = {
    assessment: "template-accent--teal",
    quiz: "template-accent--violet",
    exam: "template-accent--rose",
    lesson: "template-accent--sky",
    certificate: "template-accent--gold",
  };

  /**
   * Resolve template accent class
   */
  static resolve(
    templateType: string | null | undefined,
    templateIdentifier?: string | null | undefined,
  ): string {
    if (!this.PALETTE.length) {
      return "";
    }

    if (typeof templateType === "string" && templateType.trim().length > 0) {
      const normalizedType = templateType.trim().toLowerCase();
      const mappedClass = this.BY_TYPE[normalizedType];
      if (mappedClass) {
        return mappedClass;
      }
    }

    const fallbackKey =
      (typeof templateIdentifier === "string" && templateIdentifier.trim().length > 0
        ? templateIdentifier.trim()
        : templateType && templateType.trim().length > 0
        ? templateType.trim()
        : "") || "";

    if (!fallbackKey) {
      return this.PALETTE[0];
    }

    let hash = 0;
    for (const char of fallbackKey) {
      hash = (hash + char.charCodeAt(0)) % this.PALETTE.length;
    }

    return this.PALETTE[hash];
  }
}

