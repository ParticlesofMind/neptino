/**
 * Migration Guide: Integrating PixiJS Layout v3 
 * Step-by-step integration with existing CourseBuilder system
 */

import { CanvasLayerManager } from "../canvas/CanvasLayerManager";
import { EnhancedLayoutRenderer } from "./EnhancedLayoutRenderer";
import { DEFAULT_BLOCKS } from "./LayoutTypes";
import { Application, Container } from "pixi.js";

export class LayoutMigrationManager {
  private app: Application;
  private currentLayerManager: CanvasLayerManager;
  private enhancedRenderer: EnhancedLayoutRenderer | null = null;
  private pixiLayoutEnabled: boolean = false;

  constructor(app: Application, currentLayerManager: CanvasLayerManager) {
    this.app = app;
    this.currentLayerManager = currentLayerManager;
  }

  /**
   * Step 1: Enable PixiJS Layout v3 (gradual migration)
   */
  enablePixiLayout(): void {
    if (this.pixiLayoutEnabled) {
      console.log('⚠️ PixiJS Layout already enabled');
      return;
    }

    console.log('🚀 Enabling PixiJS Layout v3...');

    // Get the existing layout container
    const layoutContainer = this.currentLayerManager.getLayoutContainer();
    if (!layoutContainer) {
      throw new Error('❌ Layout container not found - ensure CanvasLayerManager is initialized');
    }

    // Create enhanced renderer
    this.enhancedRenderer = new EnhancedLayoutRenderer(
      layoutContainer,
      this.app.screen.width,
      this.app.screen.height
    );

    this.pixiLayoutEnabled = true;
    console.log('✅ PixiJS Layout v3 enabled successfully');
  }

  /**
   * Step 2: Render pedagogical layout using PixiJS Layout
   */
  renderPedagogicalLayout(showLabels: boolean = true): Container | null {
    if (!this.enhancedRenderer) {
      console.error('❌ Enhanced renderer not initialized - call enablePixiLayout() first');
      return null;
    }

    console.log('🎨 Rendering pedagogical layout with PixiJS Layout...');

    // Use default blocks or load from configuration
    const blocks = DEFAULT_BLOCKS;
    
    // Render using the enhanced renderer
    const layoutContainer = this.enhancedRenderer.renderPedagogicalLayout(
      blocks, 
      showLabels, 
      true // Enable responsive behavior
    );

    console.log('✅ Pedagogical layout rendered successfully');
    return layoutContainer;
  }

  /**
   * Step 3: Create template-based layouts
   */
  createTemplate(templateName: string, config?: any): Container | null {
    if (!this.enhancedRenderer) {
      console.error('❌ Enhanced renderer not initialized');
      return null;
    }

    console.log(`🎯 Creating template: ${templateName}`);

    return this.enhancedRenderer.createTemplateLayout(
      templateName,
      undefined, // Use default blocks
      config
    );
  }

  /**
   * Step 4: Update existing CanvasLayerManager to work with PixiJS Layout
   */
  updateCanvasLayerManager(): void {
    console.log('🔄 Updating CanvasLayerManager for PixiJS Layout compatibility...');

    // Store reference to enhanced renderer in layer manager
    (this.currentLayerManager as any).enhancedRenderer = this.enhancedRenderer;
    (this.currentLayerManager as any).pixiLayoutEnabled = true;

    // Add helper methods to existing layer manager
    this.addHelperMethods();

    console.log('✅ CanvasLayerManager updated for PixiJS Layout');
  }

  /**
   * Add helper methods to existing CanvasLayerManager
   */
  private addHelperMethods(): void {
    // Add method to get enhanced renderer
    (this.currentLayerManager as any).getEnhancedRenderer = () => {
      return this.enhancedRenderer;
    };

    // Add method to render pedagogical layout
    (this.currentLayerManager as any).renderPedagogicalLayout = (showLabels: boolean = true) => {
      return this.renderPedagogicalLayout(showLabels);
    };

    // Add method to toggle debug mode
    (this.currentLayerManager as any).toggleLayoutDebug = (enabled?: boolean) => {
      if (this.enhancedRenderer) {
        this.enhancedRenderer.toggleDebugMode(enabled);
      }
    };

    // Add method to update canvas dimensions
    const originalUpdateMargins = this.currentLayerManager.updateMarginBoundaries;
    (this.currentLayerManager as any).updateMarginBoundaries = (margins: any) => {
      // Call original method
      originalUpdateMargins.call(this.currentLayerManager, margins);
      
      // Update enhanced renderer if available
      if (this.enhancedRenderer) {
        this.enhancedRenderer.updateCanvasDimensions(
          this.app.screen.width,
          this.app.screen.height,
          false
        );
      }
    };
  }

  /**
   * Step 5: Comparison utility - show old vs new layout
   */
  compareLayouts(): void {
    console.log('🔄 Comparing old vs new layout systems...');

    if (!this.enhancedRenderer) {
      console.error('❌ Enhanced renderer not available for comparison');
      return;
    }

    // Create containers for comparison
    const oldLayoutContainer = new Container();
    const newLayoutContainer = new Container();

    // Position side by side
    oldLayoutContainer.x = 0;
    newLayoutContainer.x = this.app.screen.width / 2;

    // Add both to stage for comparison
    this.app.stage.addChild(oldLayoutContainer);
    this.app.stage.addChild(newLayoutContainer);

    // Render old system (current manual positioning)
    this.currentLayerManager.addBackgroundGrid();
    
    // Render new system (PixiJS Layout)
    const newRenderer = new EnhancedLayoutRenderer(
      newLayoutContainer,
      this.app.screen.width / 2,
      this.app.screen.height
    );
    newRenderer.renderPedagogicalLayout(DEFAULT_BLOCKS, true, true);

    console.log('📊 Layout comparison rendered - old system (left) vs new system (right)');
  }

  /**
   * Step 6: Complete migration - replace old system
   */
  completeMigration(): void {
    if (!this.pixiLayoutEnabled || !this.enhancedRenderer) {
      throw new Error('❌ PixiJS Layout not properly initialized');
    }

    console.log('🎯 Completing migration to PixiJS Layout...');

    // Clear old layout elements
    const layoutContainer = this.currentLayerManager.getLayoutContainer();
    if (layoutContainer) {
      layoutContainer.removeChildren();
    }

    // Render final pedagogical layout
    this.renderPedagogicalLayout(true);

    // Update the layer manager's internal state
    this.updateCanvasLayerManager();

    console.log('✅ Migration completed successfully!');
    console.log('🎉 Your CourseBuilder now uses PixiJS Layout v3 for flexible, responsive layouts');
  }

  /**
   * Rollback migration if needed
   */
  rollbackMigration(): void {
    console.log('⏪ Rolling back to original layout system...');

    // Clear enhanced layout
    if (this.enhancedRenderer) {
      this.enhancedRenderer.clear();
      this.enhancedRenderer = null;
    }

    // Restore original layer manager functionality
    const layoutContainer = this.currentLayerManager.getLayoutContainer();
    if (layoutContainer) {
      layoutContainer.removeChildren();
      this.currentLayerManager.addBackgroundGrid();
    }

    // Remove added methods from layer manager
    delete (this.currentLayerManager as any).enhancedRenderer;
    delete (this.currentLayerManager as any).pixiLayoutEnabled;
    delete (this.currentLayerManager as any).getEnhancedRenderer;
    delete (this.currentLayerManager as any).renderPedagogicalLayout;
    delete (this.currentLayerManager as any).toggleLayoutDebug;

    this.pixiLayoutEnabled = false;
    console.log('✅ Successfully rolled back to original layout system');
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): {
    pixiLayoutEnabled: boolean;
    enhancedRendererAvailable: boolean;
    migrationComplete: boolean;
  } {
    return {
      pixiLayoutEnabled: this.pixiLayoutEnabled,
      enhancedRendererAvailable: !!this.enhancedRenderer,
      migrationComplete: this.pixiLayoutEnabled && !!this.enhancedRenderer,
    };
  }

  /**
   * Test PixiJS Layout features
   */
  testPixiLayoutFeatures(): void {
    if (!this.enhancedRenderer) {
      console.error('❌ Enhanced renderer not available for testing');
      return;
    }

    console.log('🧪 Testing PixiJS Layout features...');

    // Test 1: Responsive layout
    console.log('📱 Testing responsive layout...');
    this.enhancedRenderer.updateCanvasDimensions(400, 600); // Portrait
    this.renderPedagogicalLayout(false);
    
    setTimeout(() => {
      this.enhancedRenderer!.updateCanvasDimensions(800, 400); // Landscape
      this.renderPedagogicalLayout(false);
      console.log('✅ Responsive layout test completed');
    }, 2000);

    // Test 2: Template variations
    console.log('🎨 Testing template variations...');
    setTimeout(() => {
      this.createTemplate('compact-layout', { density: 'compact', style: 'modern' });
      console.log('✅ Template variation test completed');
    }, 4000);

    // Test 3: Debug mode
    console.log('🐛 Testing debug mode...');
    setTimeout(() => {
      this.enhancedRenderer!.toggleDebugMode(true);
      console.log('✅ Debug mode test completed');
    }, 6000);
  }

  /**
   * Performance comparison
   */
  async performanceTest(): Promise<void> {
    console.log('⚡ Running performance comparison...');

    const iterations = 100;
    
    // Test old system performance
    const oldStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      this.currentLayerManager.addBackgroundGrid();
      this.currentLayerManager.clearAllLayers();
    }
    const oldTime = performance.now() - oldStart;

    // Test new system performance  
    if (this.enhancedRenderer) {
      const newStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        this.enhancedRenderer.renderPedagogicalLayout(DEFAULT_BLOCKS, false, true);
        this.enhancedRenderer.clear();
      }
      const newTime = performance.now() - newStart;

      console.log(`📊 Performance Results (${iterations} iterations):`);
      console.log(`   Old System: ${oldTime.toFixed(2)}ms`);
      console.log(`   PixiJS Layout: ${newTime.toFixed(2)}ms`);
      console.log(`   Improvement: ${((oldTime - newTime) / oldTime * 100).toFixed(1)}%`);
    }
  }
}
