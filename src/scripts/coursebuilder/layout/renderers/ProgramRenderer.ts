import { Container, Graphics } from "pixi.js";
import type { TextStyleOptions } from "pixi.js";
import { TextRenderer } from "../utils/TextRenderer.js";
import type { TableColumn } from "../utils/TableRenderer.js";

export interface ProgramData {
  competencies: Array<{
    name: string;
    topics: Array<{
      name: string;
      objectives: Array<{
        name: string;
        method?: string;
        social_form?: string;
        time?: string;
        tasks: Array<{
          name: string;
          method?: string;
          social_form?: string;
          time?: string;
        }>;
      }>;
    }>;
  }>;
}

export class ProgramRenderer {
  /**
   * Render a program block
   */
  static render(
    container: Container,
    programData: ProgramData,
    width: number,
  ): number {
    const competencies = programData.competencies || [];
    if (!competencies.length) {
      const placeholder = TextRenderer.createText(
        "No program data available.",
        TextRenderer.createTextStyle(13, 0x6b7280),
        0,
        { wordWrapWidth: width - 16 },
      );
      container.addChild(placeholder);
      return placeholder.height + 12;
    }

    const columns: TableColumn[] = [
      { key: "competency", label: "Competency" },
      { key: "topic", label: "Topic" },
      { key: "objective", label: "Objective" },
      { key: "task", label: "Task" },
      { key: "method", label: "Method" },
      { key: "social_form", label: "Social Form" },
      { key: "time", label: "Time" },
    ];

    const headerStyle = TextRenderer.createTextStyle(12, 0x1f2937, true);
    const cellStyle = TextRenderer.createTextStyle(12, 0x374151);

    let currentY = 0;
    currentY += this.drawHeader(container, columns, width, headerStyle, currentY);

    competencies.forEach((competency, competencyIndex) => {
      const topics = competency.topics || [];
      
      if (topics.length === 0) return;
      
      const firstTopic = topics[0];
      const firstObjective = firstTopic.objectives && firstTopic.objectives.length > 0 ? firstTopic.objectives[0] : null;
      const firstTask = firstObjective && firstObjective.tasks && firstObjective.tasks.length > 0 ? firstObjective.tasks[0] : null;
      
      const firstRowData: Record<string, string> = {
        competency: competency.name || "",
        topic: firstTopic.name || "",
        objective: firstObjective ? firstObjective.name || "" : "",
        task: firstTask ? firstTask.name || "" : "",
        method: firstTask ? (firstTask.method || firstObjective?.method || "") : (firstObjective?.method || ""),
        social_form: firstTask ? (firstTask.social_form || firstObjective?.social_form || "") : (firstObjective?.social_form || ""),
        time: firstTask ? (firstTask.time || firstObjective?.time || "") : (firstObjective?.time || ""),
      };
      
      currentY += this.drawRow(container, columns, width, cellStyle, firstRowData, currentY, competencyIndex % 2 === 1);
      
      // Additional rows for additional topics
      if (topics.length > 1) {
        topics.slice(1).forEach((topic, topicIndex) => {
          const additionalRowData: Record<string, string> = {
            competency: "",
            topic: topic.name || "",
            objective: "",
            task: "",
            method: "",
            social_form: "",
            time: "",
          };
          
          currentY += this.drawRow(container, columns, width, cellStyle, additionalRowData, currentY, (competencyIndex + topicIndex + 1) % 2 === 1);
        });
      }
    });

    return currentY;
  }

  /**
   * Draw table header
   */
  private static drawHeader(
    container: Container,
    columns: TableColumn[],
    width: number,
    style: any,
    startY: number,
  ): number {
    const columnWidth = Math.max(width / columns.length, 80);
    
    return this.drawRow(
      container,
      columns,
      width,
      style,
      columns.reduce<Record<string, string>>((acc, column) => {
        acc[column.key] = column.label;
        return acc;
      }, {}),
      startY,
      false,
    );
  }

  /**
   * Draw a single table row
   */
  private static drawRow(
    container: Container,
    columns: TableColumn[],
    width: number,
    style: TextStyleOptions,
    cells: Record<string, string>,
    startY: number,
    zebra: boolean,
  ): number {
    const columnWidth = Math.max(width / columns.length, 80);
    const baseRowHeight = 34;

    const texts = columns.map((column) => {
      const value = cells[column.key] ?? "";
      return TextRenderer.createText(value, style, 0, {
        wordWrapWidth: Math.max(columnWidth - 24, 32),
      });
    });

    let rowHeight = baseRowHeight;
    texts.forEach((text) => {
      rowHeight = Math.max(rowHeight, text.height + 18);
    });

    // Background
    const background = new Graphics();
    background.rect(0, startY, width, rowHeight).fill({
      color: zebra ? 0xf9fafb : 0xffffff,
      alpha: 1,
    });
    background.stroke({ color: 0xd1d5db, width: 1 });
    container.addChild(background);

    // Column dividers and text
    let currentX = 0;
    columns.forEach((column, index) => {
      if (index > 0) {
        const divider = new Graphics();
        divider.moveTo(currentX, startY);
        divider.lineTo(currentX, startY + rowHeight);
        divider.stroke({ color: 0xd1d5db, width: 1 });
        container.addChild(divider);
      }

      const text = texts[index];
      text.x = currentX + 12;
      text.y = startY + (rowHeight - text.height) / 2;
      container.addChild(text);

      currentX += columnWidth;
    });

    return rowHeight;
  }
}

