import { Container, Text, TextStyle } from "pixi.js";
import type { TemplateSectionFieldConfig } from "./PageRenderTypes";
import {
  HEADER_FIELD_LABELS,
  HEADER_FIELD_ORDER,
} from "./PageRenderConstants";

type LabelStyleFactory = () => TextStyle;
type ValueStyleFactory = (width: number) => TextStyle;

interface PageHeaderRendererOptions {
  container: Container;
  width: number;
  height: number;
  template: TemplateSectionFieldConfig | null;
  createLabelStyle: LabelStyleFactory;
  createValueStyle: ValueStyleFactory;
  formatFieldValue: (key: string, templateValue?: unknown) => string;
}

const LABEL_SPACING = 4;
const EXCLUDED_FIELDS = new Set(["institution_name"]);
const FALLBACK_FIELD = "lesson_number";

export class PageHeaderRenderer {
  private container: Container;
  private width: number;
  private height: number;
  private template: TemplateSectionFieldConfig | null;
  private createLabelStyle: LabelStyleFactory;
  private createValueStyle: ValueStyleFactory;
  private formatFieldValue: (key: string, templateValue?: unknown) => string;

  constructor(options: PageHeaderRendererOptions) {
    this.container = options.container;
    this.width = options.width;
    this.height = options.height;
    this.template = options.template;
    this.createLabelStyle = options.createLabelStyle;
    this.createValueStyle = options.createValueStyle;
    this.formatFieldValue = options.formatFieldValue;
  }

  render(): void {
    const headerOrder =
      this.template && this.template.order.length
        ? this.template.order
        : [...HEADER_FIELD_ORDER];

    const sequence = headerOrder.filter((key) => !EXCLUDED_FIELDS.has(key));
    const items = sequence
      .map((key) => {
        const templateValue = this.template ? this.template.values[key] : undefined;
        const value = this.formatFieldValue(key, templateValue);
        if (!value) {
          return null;
        }

        const label = this.template?.labels.get(key) ?? HEADER_FIELD_LABELS[key] ?? this.formatLabel(key);
        return { label, value };
      })
      .filter((item): item is { label: string; value: string } => Boolean(item?.value?.trim().length));

    if (!items.length) {
      items.push({
        label: HEADER_FIELD_LABELS[FALLBACK_FIELD] ?? this.formatLabel(FALLBACK_FIELD),
        value: this.formatFieldValue(FALLBACK_FIELD),
      });
    }

    const cellWidth = this.width / items.length;
    items.forEach((item, index) => {
      const centerX = index * cellWidth + cellWidth / 2;
      const label = new Text({
        text: item.label.toUpperCase(),
        style: this.createLabelStyle(),
      });
      label.anchor.set(0.5, 0);
      label.x = centerX;

      const valueStyle = this.createValueStyle(Math.max(1, cellWidth - 32));
      const value = new Text({
        text: item.value,
        style: valueStyle,
      });

      const blockHeight = label.height + LABEL_SPACING + value.height;
      const startY = Math.max(0, (this.height - blockHeight) / 2);
      label.y = startY;
      this.container.addChild(label);

      value.anchor.set(0.5, 0);
      value.x = centerX;
      value.y = startY + label.height + LABEL_SPACING;
      this.container.addChild(value);
    });
  }

  private formatLabel(key: string): string {
    return key
      .split(/[_-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}
