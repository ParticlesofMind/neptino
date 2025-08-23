/**
 * PixiJS Layout v3 Integration Example
 * Shows how to integrate the new layout system with your existing CourseBuilder
 */

import "@pixi/layout"; // MUST be imported first!
import { PixiCanvas } from "../canvas/PixiCanvas";
import { LayoutMigrationManager } from "./LayoutMigrationManager";

// Example: Update your existing coursebuilder.ts to use PixiJS Layout v3
export class CourseBuilderWithPixiLayout {
  private pixiCanvas: PixiCanvas | null = null;
  private migrationManager: LayoutMigrationManager | null = null;

  async initializeWithPixiLayout(containerSelector: string): Promise<void> {
    console.log('🚀 Initializing CourseBuilder with PixiJS Layout v3...');

    // Step 1: Initialize PixiJS canvas as usual
    this.pixiCanvas = new PixiCanvas(containerSelector);
    await this.pixiCanvas.init();

    // Step 2: Get the app and layer manager
    const app = this.pixiCanvas.getApp();
    if (!app) {
      throw new Error('❌ PixiJS app not initialized');
    }

    // Step 3: Create migration manager to bridge old and new systems
    const layerManager = (this.pixiCanvas as any).layerManager; // Access layer manager
    if (layerManager) {
      this.migrationManager = new LayoutMigrationManager(app, layerManager);
      
      // Enable PixiJS Layout v3
      this.migrationManager.enablePixiLayout();
      
      // Render the pedagogical layout
      this.migrationManager.renderPedagogicalLayout(true);
      
      // Complete the migration
      this.migrationManager.completeMigration();
    }

    console.log('✅ CourseBuilder with PixiJS Layout v3 initialized successfully!');
  }

  /**
   * Example: Create different layout templates
   */
  createLayoutTemplates(): void {
    if (!this.migrationManager) {
      console.error('❌ Migration manager not initialized');
      return;
    }

    // Template 1: Compact layout for mobile
    console.log('📱 Creating compact mobile layout...');
    this.migrationManager.createTemplate('mobile-compact', {
      orientation: 'portrait',
      density: 'compact',
      style: 'modern'
    });

    // Template 2: Spacious layout for desktop
    console.log('🖥️ Creating spacious desktop layout...');
    this.migrationManager.createTemplate('desktop-spacious', {
      orientation: 'landscape', 
      density: 'spacious',
      style: 'classic'
    });

    // Template 3: Minimal layout for presentations
    console.log('📽️ Creating minimal presentation layout...');
    this.migrationManager.createTemplate('presentation-minimal', {
      orientation: 'landscape',
      density: 'compact',
      style: 'minimal'
    });
  }

  /**
   * Example: Toggle debug mode to see layout boundaries
   */
  toggleDebugMode(enabled?: boolean): void {
    if (this.migrationManager) {
      const renderer = (this.migrationManager as any).enhancedRenderer;
      if (renderer) {
        renderer.toggleDebugMode(enabled);
        console.log(`🐛 Debug mode ${enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }

  /**
   * Example: Run performance tests
   */
  async runPerformanceTests(): Promise<void> {
    if (this.migrationManager) {
      await this.migrationManager.performanceTest();
    }
  }

  /**
   * Example: Test all PixiJS Layout features
   */
  testAllFeatures(): void {
    if (this.migrationManager) {
      this.migrationManager.testPixiLayoutFeatures();
    }
  }
}

// Example usage in your existing coursebuilder.ts file:

/*
// Replace your existing canvas initialization with:

import { CourseBuilderWithPixiLayout } from './layout/PixiLayoutExample';

export class CourseBuilderCanvas {
  private pixiLayoutBuilder: CourseBuilderWithPixiLayout | null = null;

  private async initializeCanvas(): Promise<void> {
    try {
      console.log('🎨 Initializing PIXI Canvas with Layout v3...');
      
      // Use the new PixiJS Layout integration
      this.pixiLayoutBuilder = new CourseBuilderWithPixiLayout();
      await this.pixiLayoutBuilder.initializeWithPixiLayout("#canvas-container");
      
      // Optional: Create layout templates
      this.pixiLayoutBuilder.createLayoutTemplates();
      
      // Optional: Enable debug mode during development
      this.pixiLayoutBuilder.toggleDebugMode(true);
      
      console.log('✅ PIXI Canvas with Layout v3 initialized');
    } catch (error) {
      console.error('❌ Failed to initialize canvas with PixiJS Layout:', error);
      throw error;
    }
  }

  // Add methods to access PixiJS Layout features
  public toggleLayoutDebug(enabled?: boolean): void {
    if (this.pixiLayoutBuilder) {
      this.pixiLayoutBuilder.toggleDebugMode(enabled);
    }
  }

  public async testPerformance(): Promise<void> {
    if (this.pixiLayoutBuilder) {
      await this.pixiLayoutBuilder.runPerformanceTests();
    }
  }

  public testLayoutFeatures(): void {
    if (this.pixiLayoutBuilder) {
      this.pixiLayoutBuilder.testAllFeatures();
    }
  }
}
*/

// Global utility functions for console testing
if (typeof window !== 'undefined') {
  (window as any).testPixiLayout = () => {
    const builder = new CourseBuilderWithPixiLayout();
    builder.initializeWithPixiLayout("#canvas-container")
      .then(() => {
        console.log('🎉 PixiJS Layout test completed!');
        builder.createLayoutTemplates();
        builder.toggleDebugMode(true);
      })
      .catch(console.error);
  };

  (window as any).runLayoutPerformanceTest = async () => {
    const builder = new CourseBuilderWithPixiLayout();
    await builder.initializeWithPixiLayout("#canvas-container");
    await builder.runPerformanceTests();
  };

  console.log('🎯 PixiJS Layout utilities available:');
  console.log('   - testPixiLayout() - Test basic integration');
  console.log('   - runLayoutPerformanceTest() - Compare performance');
}
