import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { TemplateSectionFieldConfig } from "./PageRenderTypes";
import { FOOTER_FIELD_LABELS, FOOTER_FIELD_ORDER } from "./PageRenderConstants";

type LabelStyleFactory = () => TextStyle;
type ValueStyleFactory = (width: number) => TextStyle;

interface PageFooterRendererOptions {
  container: Container;
  width: number;
  height: number;
  template: TemplateSectionFieldConfig | null;
  createLabelStyle: LabelStyleFactory;
  createValueStyle: ValueStyleFactory;
  formatFieldValue: (key: string, templateValue?: unknown) => string;
}

const LABEL_SPACING = 4;
const SEPARATOR_PADDING = 8;

export class PageFooterRenderer {
  private container: Container;
  private width: number;
  private height: number;
  private template: TemplateSectionFieldConfig | null;
  private createLabelStyle: LabelStyleFactory;
  private createValueStyle: ValueStyleFactory;
  private formatFieldValue: (key: string, templateValue?: unknown) => string;

  constructor(options: PageFooterRendererOptions) {
    this.container = options.container;
    this.width = options.width;
    this.height = options.height;
    this.template = options.template;
    this.createLabelStyle = options.createLabelStyle;
    this.createValueStyle = options.createValueStyle;
    this.formatFieldValue = options.formatFieldValue;
  }

  render(): void {
    const footerOrder =
      this.template && this.template.order.length
        ? this.template.order
        : [...FOOTER_FIELD_ORDER];

    const items = footerOrder
      .map((key) => {
        const templateValue = this.template ? this.template.values[key] : undefined;
        const value = this.formatFieldValue(key, templateValue);
        if (!value) {
          return null;
        }

        const label = this.template?.labels.get(key) ?? FOOTER_FIELD_LABELS[key] ?? this.formatLabel(key);
        return { label, value };
      })
      .filter((item): item is { label: string; value: string } => Boolean(item?.value?.trim().length));

    if (!items.length) {
      items.push({
        label: FOOTER_FIELD_LABELS.page_number ?? this.formatLabel("page_number"),
        value: this.formatFieldValue("page_number"),
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
      const availableHeight = Math.max(0, this.height - SEPARATOR_PADDING);
      const desiredStart = SEPARATOR_PADDING + Math.max(0, (availableHeight - blockHeight) / 2);
      const maxStart = Math.max(0, this.height - blockHeight);
      const startY = Math.min(desiredStart, maxStart);
      label.y = Math.max(0, startY);
      this.container.addChild(label);

      value.anchor.set(0.5, 0);
      value.x = centerX;
      value.y = startY + label.height + LABEL_SPACING;
      this.container.addChild(value);
    });

    const separator = new Graphics();
    separator.moveTo(40, 0);
    separator.lineTo(this.width - 40, 0);
    separator.stroke({ color: 0xe2e8f0, width: 1 });
    this.container.addChild(separator);
  }

  private formatLabel(key: string): string {
    return key
      .split(/[_-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}
