import "@pixi/layout";
import { Container, Graphics } from "pixi.js";
import { TextRenderer } from "./TextRenderer.js";
import type {
  FormField,
  FormGridData,
  FieldSpan,
  FormSection,
} from "./TemplateFieldTypes.js";

const DEFAULT_FORM_WIDTH = 1240;
const DEFAULT_FORM_HEIGHT = 1754;
const DEFAULT_GAP = 24;
const DEFAULT_PADDING = 32;

const LABEL_STYLE = TextRenderer.createTextStyle(14, 0x111827, true);
const VALUE_STYLE = TextRenderer.createTextStyle(13, 0x1f2937);
const PLACEHOLDER_STYLE = TextRenderer.createTextStyle(13, 0x9ca3af, false, true);
const HELP_STYLE = TextRenderer.createTextStyle(12, 0x6b7280);
const ERROR_STYLE = TextRenderer.createTextStyle(12, 0xb91c1c, true);
const SECTION_HEADER_STYLE = TextRenderer.createTextStyle(16, 0x0f172a, true);

interface RenderOptions {
  availableWidth?: number;
}

interface VisibilityState {
  byKey: Record<string, unknown>;
  byId: Record<string, unknown>;
}

export class FormGridRenderer {
  /**
   * Render form grid into the provided container using Yoga layout.
   */
  static render(
    container: Container,
    data: FormGridData,
    options: RenderOptions = {},
  ): number {
    const baseWidth = typeof data.width === "number" ? data.width : DEFAULT_FORM_WIDTH;
    const baseHeight = typeof data.height === "number" ? data.height : DEFAULT_FORM_HEIGHT;
    const gap = typeof data.gap === "number" ? data.gap : DEFAULT_GAP;
    const padding = typeof data.padding === "number" ? data.padding : DEFAULT_PADDING;

    const availableWidth = Math.max(options.availableWidth ?? baseWidth, 360);
    const layoutWidth = Math.min(availableWidth, baseWidth);
    const horizontalPadding = Math.min(padding, Math.max(layoutWidth * 0.1, 24));
    const trackWidth = Math.max(layoutWidth - horizontalPadding * 2, layoutWidth * 0.5);
    const targetHeight = baseHeight;

    const visibilityState = this.buildVisibilityState(data);

    const root = new Container({
      layout: {
        width: layoutWidth,
        minHeight: targetHeight,
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        paddingLeft: horizontalPadding,
        paddingRight: horizontalPadding,
        paddingTop: padding,
        paddingBottom: padding,
        gap,
      },
    });
    root.label = "form-grid-root";
    this.lockDisplayObject(root);

    const background = new Graphics();
    background.label = "form-grid-background";
    this.lockDisplayObject(background);
    root.addChild(background);

    root.on("layout", (layout) => {
      background.clear();
      background.roundRect(
        0,
        0,
        layout.computedLayout.width,
        layout.computedLayout.height,
        16,
      );
      background.fill({ color: 0xffffff, alpha: 0.98 });
      background.stroke({ color: 0xe5e7eb, width: 2, alpha: 0.85 });
    });

    data.sections.forEach((section) => {
      if (!section || !Array.isArray(section.fields) || !section.fields.length) {
        return;
      }
      const sectionContainer = this.createSectionContainer(section, trackWidth, gap, visibilityState);
      root.addChild(sectionContainer);
    });

    container.addChild(root);

    return targetHeight;
  }

  private static createSectionContainer(
    section: FormSection,
    trackWidth: number,
    gap: number,
    state: VisibilityState,
  ): Container {
    const container = new Container({
      layout: {
        width: "100%",
        flexDirection: "column",
        alignItems: "stretch",
        gap: gap * 0.5,
      },
    });
    container.label = `section-${section.id}`;
    this.lockDisplayObject(container);

    const header = TextRenderer.createText(
      section.title ?? "Section",
      SECTION_HEADER_STYLE,
      0,
      { wordWrapWidth: trackWidth },
    );
    container.addChild(header);

    if (section.helpText) {
      const help = TextRenderer.createText(
        section.helpText,
        HELP_STYLE,
        header.height + 4,
        { wordWrapWidth: trackWidth },
      );
      container.addChild(help);
    }

    const fieldsContainer = new Container({
      layout: {
        width: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "flex-start",
      },
    });
    fieldsContainer.label = `${section.id}-fields`;
    this.lockDisplayObject(fieldsContainer);

    section.fields.forEach((field) => {
      if (!this.isFieldVisible(field, state)) {
        return;
      }

      const fieldContainer = this.createFieldComponent(field, trackWidth, gap);
      fieldsContainer.addChild(fieldContainer);
    });

    container.addChild(fieldsContainer);
    return container;
  }

  private static createFieldComponent(
    field: FormField,
    trackWidth: number,
    gap: number,
  ): Container {
    const fieldWidth = this.estimateFieldWidth(field.width, trackWidth, gap);

    const container = new Container({
      layout: {
        flexGrow: field.width === "full" ? 1 : 0,
        flexShrink: 1,
        flexBasis: fieldWidth,
        minWidth: Math.min(fieldWidth, trackWidth),
        maxWidth: fieldWidth,
        marginRight: gap,
        marginBottom: gap,
      },
    });
    container.label = `field-${field.id}`;
    this.lockDisplayObject(container);

    let cursorY = 0;
    const label = TextRenderer.createText(
      field.label ?? field.id,
      LABEL_STYLE,
      cursorY,
      { wordWrapWidth: fieldWidth },
    );
    container.addChild(label);
    cursorY += label.height + 6;

    const contentHeight = Math.max(56, Number(field.meta?.contentHeight) || 0);
    const contentBox = new Graphics();
    contentBox.label = `${field.id}-content`;
    contentBox.roundRect(0, cursorY, fieldWidth, contentHeight, 10);
    contentBox.fill({ color: 0xf9fafb, alpha: 1 });
    contentBox.stroke({ color: field.error ? 0xfb7185 : 0xd1d5db, width: 2 });
    this.lockDisplayObject(contentBox);
    container.addChild(contentBox);

    if (field.value && field.value.trim().length > 0) {
      const value = TextRenderer.createText(
        field.value,
        VALUE_STYLE,
        cursorY + 12,
        { wordWrapWidth: Math.max(fieldWidth - 24, 32) },
      );
      value.x = 12;
      container.addChild(value);
    } else if (field.placeholder) {
      const placeholder = TextRenderer.createText(
        field.placeholder,
        PLACEHOLDER_STYLE,
        cursorY + 12,
        { wordWrapWidth: Math.max(fieldWidth - 24, 32) },
      );
      placeholder.x = 12;
      container.addChild(placeholder);
    }

    cursorY += contentHeight + 8;

    if (field.helpText) {
      const help = TextRenderer.createText(
        field.helpText,
        HELP_STYLE,
        cursorY,
        { wordWrapWidth: fieldWidth },
      );
      container.addChild(help);
      cursorY += help.height + 6;
    }

    if (field.error) {
      const error = TextRenderer.createText(
        field.error,
        ERROR_STYLE,
        cursorY,
        { wordWrapWidth: fieldWidth },
      );
      container.addChild(error);
    }

    return container;
  }

  private static estimateFieldWidth(
    span: FieldSpan | undefined,
    trackWidth: number,
    gap: number,
  ): number {
    const effectiveSpan = span ?? "full";
    const adjustedGap = gap || DEFAULT_GAP;
    switch (effectiveSpan) {
      case "half": {
        const width = (trackWidth - adjustedGap) / 2;
        return Math.max(width, Math.min(trackWidth, 360));
      }
      case "third": {
        const width = (trackWidth - adjustedGap * 2) / 3;
        return Math.max(width, Math.min(trackWidth / 2, 280));
      }
      case "full":
      default:
        return trackWidth;
    }
  }

  private static isFieldVisible(field: FormField, state: VisibilityState): boolean {
    if (!field.visibility || !field.visibility.length) {
      return true;
    }

    return field.visibility.every((rule) => {
      const candidate =
        state.byKey[rule.fieldId] ?? state.byId[rule.fieldId] ?? state.byKey[`${rule.fieldId}`];

      if (rule.equals !== undefined) {
        return candidate === rule.equals;
      }

      if (rule.notEquals !== undefined) {
        return candidate !== rule.notEquals;
      }

      if (rule.includes && rule.includes.length) {
        return rule.includes.map(String).includes(String(candidate ?? ""));
      }

      if (rule.excludes && rule.excludes.length) {
        return !rule.excludes.map(String).includes(String(candidate ?? ""));
      }

      return true;
    });
  }

  private static buildVisibilityState(data: FormGridData): VisibilityState {
    const byKey: Record<string, unknown> = {};
    const byId: Record<string, unknown> = {};

    data.sections.forEach((section) => {
      section.fields.forEach((field) => {
        const stateKey = field.stateKey ?? field.id;
        if (byKey[stateKey] === undefined) {
          byKey[stateKey] = field.value ?? null;
        }
        if (byId[field.id] === undefined) {
          byId[field.id] = field.value ?? null;
        }
      });
    });

    return { byKey, byId };
  }

  private static lockDisplayObject(object: Container | Graphics): void {
    const target = object as any;
    target.__locked = true;
    if ("eventMode" in target) {
      target.eventMode = "none";
    }
    if ("interactive" in target) {
      target.interactive = false;
    }
    if ("interactiveChildren" in target) {
      target.interactiveChildren = false;
    }
    try {
      target.cursor = "default";
    } catch {
      /* ignore */
    }
  }
}
