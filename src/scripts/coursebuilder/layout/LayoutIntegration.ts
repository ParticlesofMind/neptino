/**
 * Integration helper for connecting PixiJS Layout v3 with existing coursebuilder
 * Provides a bridge between the new EducationalLayoutSystem and existing PixiCanvas
 */

import { Application } from 'pixi.js';
import { EducationalLayoutSystem, EducationalLayoutConfig, LayoutTemplateDefinition } from './EducationalLayoutSystemV3';

export class LayoutIntegration {
  private layoutSystem: EducationalLayoutSystem;

  constructor(app: Application) {
    this.layoutSystem = new EducationalLayoutSystem(app);
    
    console.log('🔗 LayoutIntegration initialized - bridging PixiJS Layout v3 with coursebuilder');
  }

  /**
   * Initialize the layout system with a default educational template
   */
  public initializeDefaultLayout(): void {
    const defaultTemplate = this.layoutSystem.createLayoutFromTemplate('standard-lesson', {
      collaboration: true,
      accessibility: {
        highContrast: false,
        largeText: false,
        screenReader: true
      }
    });

    if (defaultTemplate) {
      console.log('✅ Default educational layout initialized successfully');
    } else {
      console.error('❌ Failed to initialize default layout');
    }
  }

  /**
   * Get available educational templates
   */
  public getTemplates(): LayoutTemplateDefinition[] {
    return this.layoutSystem.getAvailableTemplates();
  }

  /**
   * Switch to a different layout template
   */
  public switchTemplate(templateId: string, config?: Partial<EducationalLayoutConfig>): boolean {
    const newLayout = this.layoutSystem.createLayoutFromTemplate(templateId, config);
    
    if (newLayout) {
      console.log(`🔄 Switched to template: ${templateId}`);
      return true;
    } else {
      console.error(`❌ Failed to switch to template: ${templateId}`);
      return false;
    }
  }

  /**
   * Add a collaborator to the current layout
   */
  public addCollaborator(userId: string, userName: string, color?: number): void {
    this.layoutSystem.addCollaborator(userId, userName, color);
  }

  /**
   * Remove a collaborator from the current layout
   */
  public removeCollaborator(userId: string): void {
    this.layoutSystem.removeCollaborator(userId);
  }

  /**
   * Update collaborator cursor position
   */
  public updateCollaboratorCursor(userId: string, x: number, y: number): void {
    this.layoutSystem.updateCollaboratorCursor(userId, x, y);
  }

  /**
   * Handle canvas resize
   */
  public onResize(width: number, height: number): void {
    this.layoutSystem.resize(width, height);
  }

  /**
   * Get the layout system instance for advanced operations
   */
  public getLayoutSystem(): EducationalLayoutSystem {
    return this.layoutSystem;
  }

  /**
   * Destroy the layout integration
   */
  public destroy(): void {
    this.layoutSystem.destroy();
    console.log('🗑️ LayoutIntegration destroyed');
  }
}

// Factory function for easy integration
export function createEducationalLayout(app: Application): LayoutIntegration {
  return new LayoutIntegration(app);
}

// Export types for external use
export type { EducationalLayoutConfig, LayoutTemplateDefinition } from './EducationalLayoutSystemV3';
