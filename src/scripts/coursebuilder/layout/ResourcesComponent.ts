/**
 * ResourcesComponent - Renders resources information in a layout region
 * 
 * This component handles the display of educational resources like textbooks,
 * readings, videos, and assignments within the layout system.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { LayoutRegion, ColumnConfiguration } from './LayoutManager';

export interface ResourcesContent {
  type: 'columns' | 'sections';
  
  // For columns type (template-driven)
  fields?: string[];
  distribution?: number[];
  values?: Record<string, string>;
  
  // Glossary support
  glossaryFields?: string[];
  includeGlossary?: boolean;
  
  // For sections type (individual fields)
  textbook?: string;
  readings?: string;
  videos?: string;
  assignments?: string;
  labs?: string;
  projects?: string;
}

export class ResourcesComponent {
  private container: Container;
  private content: ResourcesContent;
  private region: LayoutRegion;
  private columnConfig?: ColumnConfiguration;

  constructor(region: LayoutRegion, content: ResourcesContent = { type: 'columns' }, columnConfig?: ColumnConfiguration) {
    this.region = region;
    this.content = content;
    this.columnConfig = columnConfig;
    this.container = new Container();
    this.render();
  }

  /**
   * Render the resources component
   */
  private render(): void {
    this.clear();
    
    if (this.content.type === 'columns') {
      this.renderColumnContent();
    } else {
      this.renderSectionContent();
    }

    // Position container within region
    this.container.x = this.region.x;
    this.container.y = this.region.y;
    
    console.log('📚 Resources component rendered with content type:', this.content.type);
  }

  /**
   * Render content as columns (template-driven)
   */
  private renderColumnContent(): void {
    const fields = this.content.fields || this.columnConfig?.resourcesFields || ['task', 'type', 'origin'];
    const values = this.content.values || this.columnConfig?.resourcesValues || {};
    const glossaryFields = this.content.glossaryFields || [];
    const includeGlossary = this.content.includeGlossary || false;
    
    // Calculate heights
    const mainRowHeight = includeGlossary && glossaryFields.length > 0 ? this.region.height * 0.4 : this.region.height;
    const glossaryRowHeight = (this.region.height - mainRowHeight) / Math.max(glossaryFields.length, 1);
    
    // Add background
    const background = new Graphics();
    background.rect(0, 0, this.region.width, this.region.height);
    background.fill('#f8f9fa');
    background.stroke({ color: '#dee2e6', width: 1 });
    this.container.addChild(background);

    // Render main row: task | type | origin | state | quality
    this.renderMainResourcesRow(fields, values, 0, mainRowHeight);

    // Render glossary section if enabled
    if (includeGlossary && glossaryFields.length > 0) {
      this.renderGlossarySection(glossaryFields, mainRowHeight, glossaryRowHeight);
    }

    console.log(`📚 Resources rendered with ${fields.length} main fields and ${glossaryFields.length} glossary fields`);
  }

  /**
   * Render the main resources row
   */
  private renderMainResourcesRow(fields: string[], values: Record<string, string>, y: number, height: number): void {
    const columnWidth = this.region.width / fields.length;

    fields.forEach((field, index) => {
      const x = index * columnWidth;
      const fieldLabel = this.getFieldLabel(field);
      const fieldValue = values[field] || '';

      // Column separator (except for the first column)
      if (index > 0) {
        const separator = new Graphics();
        separator.moveTo(x, y);
        separator.lineTo(x, y + height);
        separator.stroke({ color: '#dee2e6', width: 1 });
        this.container.addChild(separator);
      }

      // Field label
      const labelStyle = new TextStyle({
        fontSize: 12,
        fontWeight: 'bold',
        fill: '#495057'
      });
      const label = new Text({ text: fieldLabel, style: labelStyle });
      label.x = x + 8;
      label.y = y + 8;
      this.container.addChild(label);

      // Field value with word wrap
      const valueStyle = new TextStyle({
        fontSize: 10,
        fill: '#6c757d',
        wordWrap: true,
        wordWrapWidth: columnWidth - 16
      });
      const value = new Text({ text: fieldValue, style: valueStyle });
      value.x = x + 8;
      value.y = y + 28;
      this.container.addChild(value);
    });
  }

  /**
   * Render the glossary section
   */
  private renderGlossarySection(glossaryFields: string[], startY: number, rowHeight: number): void {
    // Separator line between main section and glossary
    const mainSeparator = new Graphics();
    mainSeparator.moveTo(0, startY);
    mainSeparator.lineTo(this.region.width, startY);
    mainSeparator.stroke({ color: '#dee2e6', width: 2 });
    this.container.addChild(mainSeparator);

    glossaryFields.forEach((field, index) => {
      const y = startY + (index * rowHeight);
      const fieldLabel = this.getFieldLabel(field);
      
      // Row separator (except for the first row)
      if (index > 0) {
        const separator = new Graphics();
        separator.moveTo(0, y);
        separator.lineTo(this.region.width, y);
        separator.stroke({ color: '#dee2e6', width: 1 });
        this.container.addChild(separator);
      }

      // Middle column separator (50/50 split: Field | URL)
      const middleX = this.region.width / 2;
      const columnSeparator = new Graphics();
      columnSeparator.moveTo(middleX, y);
      columnSeparator.lineTo(middleX, y + rowHeight);
      columnSeparator.stroke({ color: '#dee2e6', width: 1 });
      this.container.addChild(columnSeparator);

      // Field label (left column)
      const labelStyle = new TextStyle({
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#495057'
      });
      const label = new Text({ text: fieldLabel, style: labelStyle });
      label.x = 8;
      label.y = y + 8;
      this.container.addChild(label);

      // URL label (right column)
      const urlStyle = new TextStyle({
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#495057'
      });
      const urlLabel = new Text({ text: 'URL', style: urlStyle });
      urlLabel.x = middleX + 8;
      urlLabel.y = y + 8;
      this.container.addChild(urlLabel);
    });
  }

  /**
   * Render content as sections (individual fields)
   */
  private renderSectionContent(): void {
    const sections = [
      { key: 'textbook', label: 'Textbook', value: this.content.textbook },
      { key: 'readings', label: 'Readings', value: this.content.readings },
      { key: 'videos', label: 'Videos', value: this.content.videos },
      { key: 'assignments', label: 'Assignments', value: this.content.assignments },
      { key: 'labs', label: 'Labs', value: this.content.labs },
      { key: 'projects', label: 'Projects', value: this.content.projects }
    ].filter(section => section.value);

    // Add background
    const background = new Graphics();
    background.rect(0, 0, this.region.width, this.region.height);
    background.fill('#f8f9fa');
    background.stroke({ color: '#dee2e6', width: 1 });
    this.container.addChild(background);

    const sectionHeight = this.region.height / Math.max(sections.length, 1);
    
    sections.forEach((section, index) => {
      const y = index * sectionHeight;

      // Section separator (except for the first section)
      if (index > 0) {
        const separator = new Graphics();
        separator.moveTo(0, y);
        separator.lineTo(this.region.width, y);
        separator.stroke({ color: '#dee2e6', width: 1 });
        this.container.addChild(separator);
      }

      // Section label
      const labelStyle = new TextStyle({
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#495057'
      });
      const label = new Text({ text: section.label, style: labelStyle });
      label.x = 8;
      label.y = y + 6;
      this.container.addChild(label);

      // Section value
      const valueStyle = new TextStyle({
        fontSize: 10,
        fill: '#6c757d',
        wordWrap: true,
        wordWrapWidth: this.region.width - 16
      });
      const value = new Text({ text: section.value || '', style: valueStyle });
      value.x = 8;
      value.y = y + 22;
      this.container.addChild(value);
    });

    console.log('📚 Resources rendered as sections:', sections.map(s => s.key));
  }

  /**
   * Get user-friendly label for field
   */
  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      task: 'Task',
      type: 'Type',
      origin: 'Origin',
      state: 'State',
      quality: 'Quality',
      include_glossary: 'Include Glossary',
      historical_figures: 'Historical figures',
      terminology: 'Terminology',
      concepts: 'Concepts'
    };
    return labels[field] || field.charAt(0).toUpperCase() + field.slice(1);
  }

  /**
   * Update resources content
   */
  public updateContent(newContent: Partial<ResourcesContent>): void {
    this.content = { ...this.content, ...newContent };
    this.render();
    console.log('📚 Resources content updated');
  }

  /**
   * Update column configuration
   */
  public updateColumnConfig(columnConfig: ColumnConfiguration): void {
    this.columnConfig = columnConfig;
    if (this.content.type === 'columns') {
      this.render();
      console.log('📚 Resources column configuration updated');
    }
  }

  /**
   * Clear the container
   */
  private clear(): void {
    while (this.container.children.length > 0) {
      this.container.removeChildAt(0);
    }
  }

  /**
   * Get the PIXI container
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Update region (for responsive layouts)
   */
  public updateRegion(newRegion: LayoutRegion): void {
    this.region = newRegion;
    this.render();
    console.log('📚 Resources region updated:', newRegion);
  }

  /**
   * Destroy the component and clean up resources
   */
  public destroy(): void {
    this.clear();
    this.container.destroy();
    console.log('📚 Resources component destroyed');
  }
}
