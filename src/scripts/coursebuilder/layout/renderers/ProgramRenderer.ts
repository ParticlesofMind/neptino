import { Container, Graphics } from "pixi.js";
import type { TextStyleOptions } from "pixi.js";
import { TextRenderer } from "../utils/TextRenderer.js";
import type { TemplateTableColumn } from "../utils/TemplateFieldTypes.js";

type TableColumn = TemplateTableColumn;

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

    let rowIndex = 0;
    
    competencies.forEach((competency) => {
      const topics = competency.topics || [];
      
      if (topics.length === 0) return;
      
      // Track if this is the first row for this competency
      let isFirstRowInCompetency = true;
      
      topics.forEach((topic) => {
        const objectives = topic.objectives || [];
        
        // If no objectives, create a row with just competency and topic
        if (objectives.length === 0) {
          const rowData: Record<string, string> = {
            competency: isFirstRowInCompetency ? competency.name || "" : "",
            topic: topic.name || "",
            objective: "",
            task: "",
            method: "",
            social_form: "",
            time: "",
          };
          
          currentY += this.drawRow(container, columns, width, cellStyle, rowData, currentY, rowIndex % 2 === 1);
          rowIndex++;
          isFirstRowInCompetency = false;
          return;
        }
        
        // Track if this is the first row for this topic
        let isFirstRowInTopic = true;
        
        objectives.forEach((objective) => {
          const tasks = objective.tasks || [];
          
          // If no tasks, create a row with competency, topic, and objective
          if (tasks.length === 0) {
            const rowData: Record<string, string> = {
              competency: isFirstRowInCompetency ? competency.name || "" : "",
              topic: isFirstRowInTopic ? topic.name || "" : "",
              objective: objective.name || "",
              task: "",
              method: objective.method || "",
              social_form: objective.social_form || "",
              time: objective.time || "",
            };
            
            currentY += this.drawRow(container, columns, width, cellStyle, rowData, currentY, rowIndex % 2 === 1);
            rowIndex++;
            isFirstRowInCompetency = false;
            isFirstRowInTopic = false;
            return;
          }
          
          // Create a row for each task
          tasks.forEach((task, taskIndex) => {
            const rowData: Record<string, string> = {
              competency: isFirstRowInCompetency ? competency.name || "" : "",
              topic: isFirstRowInTopic ? topic.name || "" : "",
              objective: taskIndex === 0 ? objective.name || "" : "",
              task: task.name || "",
              method: task.method || objective.method || "",
              social_form: task.social_form || objective.social_form || "",
              time: task.time || objective.time || "",
            };
            
            currentY += this.drawRow(container, columns, width, cellStyle, rowData, currentY, rowIndex % 2 === 1);
            rowIndex++;
            isFirstRowInCompetency = false;
            isFirstRowInTopic = false;
          });
        });
      });
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
    columns.forEach((_column, index) => {
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
