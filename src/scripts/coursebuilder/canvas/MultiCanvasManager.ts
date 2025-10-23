/**
 * MultiCanvasManager - Vertical Canvas System for Multiple Canvases
 * 
 * Responsibilities:
 * - Fetch all canvas rows from Supabase for a course
 * - Create separate PixiJS applications for each canvas (vertical stacking)
 * - Coordinate with VerticalCanvasContainer for DOM management
 * - Handle canvas creation and metadata population
 * - Provide navigation and scroll functionality
 * 
 * Target: ~200 lines
 */

import { supabase } from '../../backend/supabase';
import { VerticalCanvasContainer, CanvasApplication } from './VerticalCanvasContainer';
import type { CanvasDataPayload } from './TemplateLayoutManager';
import { CanvasLifecycleManager } from './CanvasLifecycleManager';

export interface CanvasRow {
  id: string;
  course_id: string;
  lesson_number: number;
  canvas_index: number;
  canvas_data?: CanvasDataPayload | null;
  canvas_metadata: {
    title?: string;
    template?: string;
    dimensions?: { width: number; height: number };
    created_at?: string;
    updated_at?: string;
    generatedAt?: string;
  };
}

export class MultiCanvasManager {
  private verticalContainer: VerticalCanvasContainer | null = null;
  private courseId: string | null = null;
  private navigationCallbacks: ((canvasId: string) => void)[] = [];
  private loadedCanvases = new Set<string>();
  private totalCanvases = 0;
  private canvasMetadata: CanvasRow[] = []; // Store metadata for lazy loading
  private readonly BATCH_SIZE = 3; // Reduced batch size for better performance
  private lifecycleManager: CanvasLifecycleManager;

  /**
   * Initialize the multi-canvas manager
   */
  public initialize(): void {
    this.lifecycleManager = CanvasLifecycleManager.getInstance(5); // Allow 5 concurrent canvases for better stability
    this.verticalContainer = new VerticalCanvasContainer();
    this.verticalContainer.initialize();
    
    // Subscribe to scroll changes
    this.verticalContainer.onScrollChange((canvasId: string) => {
      this.notifyNavigationCallbacks(canvasId);
    });
  }

  /**
   * Load canvases for a course with optimized performance
   */
  public async loadCourseCanvases(courseId: string): Promise<void> {
    if (!this.verticalContainer) {
      throw new Error('MultiCanvasManager not initialized');
    }

    this.courseId = courseId;
    
    try {
      console.log('📚 Loading canvases for course:', courseId);
      
      // First, fetch only metadata to create placeholders quickly
      const { data: canvasRows, error } = await supabase
        .from('canvases')
        .select('id, canvas_metadata, lesson_number, canvas_index, course_id')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true })
        .order('canvas_index', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch canvas metadata: ${error.message}`);
      }

      if (!canvasRows || canvasRows.length === 0) {
        console.log('📝 No canvases found for course, creating default canvas');
        await this.createDefaultCanvas(courseId);
        return;
      }

      this.totalCanvases = canvasRows.length;
      console.log(`📄 Found ${canvasRows.length} canvases, creating placeholders for viewport-based lazy loading`);

      // Store canvas metadata for viewport-based lazy loading
      this.canvasMetadata = canvasRows;

      // Create placeholders for ALL canvases (for intersection observer)
      for (const canvasRow of canvasRows) {
        await this.verticalContainer.createCanvasApplication(canvasRow);
      }

      console.log('✅ Viewport-based lazy loading initialized - placeholders created');

    } catch (error) {
      console.error('❌ Failed to load course canvases:', error);
      throw error;
    }
  }

  /**
   * Load a batch of canvases with full data
   */
  private async loadCanvasBatch(startIndex: number, batchSize: number): Promise<void> {
    if (!this.courseId) return;

    try {
      console.log(`📦 Loading canvas batch: ${startIndex} to ${startIndex + batchSize - 1}`);
      
      const { data: canvasRows, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('course_id', this.courseId)
        .order('lesson_number', { ascending: true })
        .order('canvas_index', { ascending: true })
        .range(startIndex, startIndex + batchSize - 1);

      if (error) {
        console.error('❌ Failed to load canvas batch:', error);
        return;
      }

      if (canvasRows && canvasRows.length > 0) {
        // Mark canvases as loaded
        canvasRows.forEach(canvas => {
          this.loadedCanvases.add(canvas.id);
        });

        console.log(`✅ Loaded batch of ${canvasRows.length} canvases`);
      }

    } catch (error) {
      console.error('❌ Failed to load canvas batch:', error);
    }
  }

  /**
   * Create a canvas on-demand when it's needed (true lazy loading)
   */
  public async createCanvasOnDemand(canvasId: string): Promise<void> {
    if (!this.verticalContainer || this.loadedCanvases.has(canvasId)) {
      return; // Already exists or not initialized
    }

    const canvasRow = this.canvasMetadata.find(row => row.id === canvasId);
    if (!canvasRow) {
      console.warn(`⚠️ Canvas metadata not found for: ${canvasId}`);
      return;
    }

    await this.lifecycleManager.withLoad(
      canvasId,
      async () => {
        if (this.verticalContainer) {
          await this.verticalContainer.createCanvasApplication(canvasRow);
          this.loadedCanvases.add(canvasId);
          console.log(`✅ Canvas created on-demand: ${canvasId}`);
        }
      },
      async () => {
        // Eviction logic
        if (this.verticalContainer) {
          const success = await this.verticalContainer.ensureCapacityForNewCanvas(canvasId);
          return success;
        }
        return false;
      }
    );
  }

  /**
   * Destroy a canvas when it's no longer needed
   */
  public destroyCanvas(canvasId: string): void {
    if (!this.verticalContainer || !this.loadedCanvases.has(canvasId)) {
      return; // Doesn't exist or not initialized
    }

    console.log(`🗑️ Destroying canvas: ${canvasId}`);
    
    this.loadedCanvases.delete(canvasId);
    this.lifecycleManager.release(canvasId);
    
    console.log(`✅ Canvas destroyed: ${canvasId}`);
  }

  /**
   * Load all canvases for a course (legacy method for backward compatibility)
   */
  public async loadAllCourseCanvases(courseId: string): Promise<void> {
    if (!this.verticalContainer) {
      throw new Error('MultiCanvasManager not initialized');
    }

    this.courseId = courseId;
    
    try {
      console.log('📚 Loading ALL canvases for course:', courseId);
      
      // Fetch all canvas rows for this course
      const { data: canvasRows, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true })
        .order('canvas_index', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch canvases: ${error.message}`);
      }

      if (!canvasRows || canvasRows.length === 0) {
        console.log('📝 No canvases found for course, creating default canvas');
        await this.createDefaultCanvas(courseId);
        return;
      }

      console.log(`📄 Found ${canvasRows.length} canvases`);

      // Create canvas applications for each canvas row
      for (const canvasRow of canvasRows) {
        await this.verticalContainer.createCanvasApplication(canvasRow);
        this.loadedCanvases.add(canvasRow.id);
      }

      this.totalCanvases = canvasRows.length;
      console.log('✅ All canvases loaded successfully');

    } catch (error) {
      console.error('❌ Failed to load course canvases:', error);
      throw error;
    }
  }

  /**
   * Create a default canvas if none exist
   */
  private async createDefaultCanvas(courseId: string): Promise<void> {
    if (!this.verticalContainer) return;

    const defaultCanvasRow: CanvasRow = {
      id: `canvas-${courseId}-1`,
      course_id: courseId,
      lesson_number: 1,
      canvas_index: 1,
      canvas_data: null,
      canvas_metadata: {
        title: 'Lesson 1 - Page 1',
        template: 'default',
        dimensions: { width: 1200, height: 1800 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    await this.verticalContainer.createCanvasApplication(defaultCanvasRow);
  }

  /**
   * Navigate to a specific canvas by ID
   */
  public showCanvas(canvasId: string): void {
    if (!this.verticalContainer) return;
    this.verticalContainer.scrollToCanvas(canvasId);
  }

  /**
   * Navigate to a canvas by lesson number
   */
  public navigateToLesson(lessonNumber: number): void {
    if (!this.verticalContainer) return;
    this.verticalContainer.scrollToLesson(lessonNumber);
  }

  /**
   * Navigate to the next canvas
   */
  public navigateToNext(): boolean {
    if (!this.verticalContainer) return false;
    
    const allCanvases = this.verticalContainer.getAllCanvases();
    const activeCanvas = this.verticalContainer.getActiveCanvas();
    
    if (!activeCanvas) return false;
    
    const currentIndex = allCanvases.findIndex(canvas => canvas.canvasRow.id === activeCanvas.canvasRow.id);
    if (currentIndex < allCanvases.length - 1) {
      const nextCanvas = allCanvases[currentIndex + 1];
      this.verticalContainer.scrollToCanvas(nextCanvas.canvasRow.id);
      return true;
    }
    
    return false;
  }

  /**
   * Navigate to the previous canvas
   */
  public navigateToPrevious(): boolean {
    if (!this.verticalContainer) return false;
    
    const allCanvases = this.verticalContainer.getAllCanvases();
    const activeCanvas = this.verticalContainer.getActiveCanvas();
    
    if (!activeCanvas) return false;
    
    const currentIndex = allCanvases.findIndex(canvas => canvas.canvasRow.id === activeCanvas.canvasRow.id);
    if (currentIndex > 0) {
      const prevCanvas = allCanvases[currentIndex - 1];
      this.verticalContainer.scrollToCanvas(prevCanvas.canvasRow.id);
      return true;
    }
    
    return false;
  }

  /**
   * Get current canvas information
   */
  public getCurrentCanvas(): CanvasApplication | null {
    return this.verticalContainer?.getActiveCanvas() || null;
  }

  /**
   * Get all canvas applications
   */
  public getAllCanvases(): CanvasApplication[] {
    return this.verticalContainer?.getAllCanvases() || [];
  }

  /**
   * Get canvas count
   */
  public getCanvasCount(): number {
    return this.verticalContainer?.getCanvasCount() || 0;
  }

  /**
   * Get current canvas index (1-based)
   */
  public getCurrentCanvasIndex(): number {
    if (!this.verticalContainer) return 0;
    
    const allCanvases = this.verticalContainer.getAllCanvases();
    const activeCanvas = this.verticalContainer.getActiveCanvas();
    
    if (!activeCanvas) return 0;
    
    const index = allCanvases.findIndex(canvas => canvas.canvasRow.id === activeCanvas.canvasRow.id);
    return index + 1;
  }

  /**
   * Subscribe to navigation events
   */
  public onNavigationChange(callback: (canvasId: string) => void): void {
    this.navigationCallbacks.push(callback);
  }

  /**
   * Unsubscribe from navigation events
   */
  public offNavigationChange(callback: (canvasId: string) => void): void {
    const index = this.navigationCallbacks.indexOf(callback);
    if (index > -1) {
      this.navigationCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all navigation callbacks
   */
  private notifyNavigationCallbacks(canvasId: string): void {
    this.navigationCallbacks.forEach(callback => {
      try {
        callback(canvasId);
      } catch (error) {
        console.warn('⚠️ Error in navigation callback:', error);
      }
    });
  }

  /**
   * Get the active canvas
   */
  public getActiveCanvas(): CanvasApplication | null {
    return this.verticalContainer?.getActiveCanvas() || null;
  }
  public getDebugInfo(): any {
    return {
      initialized: !!this.verticalContainer,
      courseId: this.courseId,
      totalCanvases: this.verticalContainer?.getCanvasCount() || 0,
      activeCanvasId: this.verticalContainer?.getActiveCanvas()?.canvasRow.id || null,
      currentCanvasIndex: this.getCurrentCanvasIndex(),
      verticalContainerDebug: this.verticalContainer?.getDebugInfo() || null
    };
  }

  /**
   * Destroy the multi-canvas manager
   */
  public destroy(): void {
    if (this.verticalContainer) {
      this.verticalContainer.destroy();
      this.verticalContainer = null;
    }

    this.courseId = null;
    this.navigationCallbacks = [];
  }
}
