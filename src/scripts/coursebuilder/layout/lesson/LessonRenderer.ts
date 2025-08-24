/**
 * Lesson Renderer
 * Lesson-specific rendering logic and optimizations
 */

import { Container } from "pixi.js";
import { TemplateRenderer } from "../core/TemplateRenderer";
import { ConfigManager } from "../core/ConfigManager";
import type { Template, RenderOptions } from "../core/LayoutTypes";
import { LESSON_TEMPLATE_CONFIG, createLessonTemplate } from "./LessonTemplate";

export class LessonRenderer {
  private templateRenderer: TemplateRenderer;
  private configManager: ConfigManager;

  constructor(layoutContainer: Container, canvasWidth: number = 794, canvasHeight: number = 1123) {
    this.templateRenderer = new TemplateRenderer(layoutContainer, canvasWidth, canvasHeight);
    this.configManager = new ConfigManager();
    
    // Initialize with default lesson configuration
    this.initializeDefaultConfig();
  }

  /**
   * Render a lesson template
   */
  renderLesson(options?: RenderOptions): Container {
    const template = createLessonTemplate({
      canvasWidth: 794,
      canvasHeight: 1123,
    });

    return this.templateRenderer.render(template, {
      showLabels: true,
      responsive: true,
      theme: "modern",
      ...options,
    });
  }

  /**
   * Render lesson with custom blocks
   */
  renderCustomLesson(customBlocks?: any[], options?: RenderOptions): Container {
    const template = createLessonTemplate();
    
    if (customBlocks) {
      // Filter to only enabled blocks
      template.blocks = template.blocks.filter(block => 
        this.configManager.isBlockEnabled(block.id)
      );
    }

    return this.templateRenderer.render(template, options);
  }

  /**
   * Toggle specific lesson blocks
   */
  toggleBlock(blockId: string, enabled: boolean): void {
    this.configManager.toggleBlock(blockId, enabled);
  }

  /**
   * Enable standard lesson blocks
   */
  enableStandardBlocks(): void {
    ["header", "program", "content", "footer"].forEach(blockId => {
      this.toggleBlock(blockId, true);
    });
  }

  /**
   * Enable all lesson blocks including optional ones
   */
  enableAllBlocks(): void {
    ["header", "program", "content", "resources", "assessment", "footer"].forEach(blockId => {
      this.toggleBlock(blockId, true);
    });
  }

  /**
   * Create a minimal lesson (header, content, footer only)
   */
  renderMinimalLesson(options?: RenderOptions): Container {
    // Disable optional blocks
    this.toggleBlock("program", false);
    this.toggleBlock("resources", false); 
    this.toggleBlock("assessment", false);

    return this.renderCustomLesson(undefined, {
      theme: "minimal",
      ...options,
    });
  }

  /**
   * Create a comprehensive lesson (all blocks enabled)
   */
  renderComprehensiveLesson(options?: RenderOptions): Container {
    this.enableAllBlocks();
    
    return this.renderCustomLesson(undefined, {
      theme: "modern",
      showLabels: true,
      ...options,
    });
  }

  /**
   * Update canvas dimensions
   */
  updateDimensions(width: number, height: number): void {
    this.templateRenderer.updateDimensions(width, height);
  }

  /**
   * Clear the rendered lesson
   */
  clear(): void {
    this.templateRenderer.clear();
  }

  /**
   * Get the underlying template renderer
   */
  getTemplateRenderer(): TemplateRenderer {
    return this.templateRenderer;
  }

  /**
   * Get the configuration manager
   */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  /**
   * Export lesson configuration
   */
  exportConfig(): any {
    return {
      type: "lesson",
      version: "1.0.0",
      ...this.configManager.exportConfig(),
    };
  }

  /**
   * Import lesson configuration
   */
  importConfig(config: any): void {
    if (config.type === "lesson") {
      this.configManager.importConfig(config);
    }
  }

  /**
   * Initialize default lesson block configurations
   */
  private initializeDefaultConfig(): void {
    LESSON_TEMPLATE_CONFIG.blocks.forEach(block => {
      this.configManager.setBlockConfig({
        id: block.id,
        name: block.name,
        type: block.type,
        heightPercentage: block.heightPercentage,
        isRequired: block.isRequired,
        enabled: block.enabled,
        styles: block.styles,
      });
    });
  }
}
