/**
 * CanvasDataManager - Database Operations for Canvas Data
 * 
 * Responsibilities:
 * - Fetch canvas rows from Supabase
 * - Parse canvas_data JSONB into PixiJS structure
 * - Save canvas changes back to database
 * - Handle canvas creation/deletion
 * - Manage canvas metadata
 * 
 * Target: ~200 lines
 */

import { supabase } from '../../backend/supabase';
import { CanvasRow } from './MultiCanvasManager';

export interface CanvasData {
  layout: any;
  content: any[];
  metadata: any;
}

export interface CanvasMetadata {
  title: string;
  template: string;
  dimensions: { width: number; height: number };
  created_at: string;
  updated_at: string;
}

export class CanvasDataManager {
  private courseId: string | null = null;
  private canvasCache = new Map<string, CanvasRow>();
  private metadataCache = new Map<string, CanvasMetadata[]>();

  /**
   * Set the current course ID
   */
  public setCourseId(courseId: string): void {
    this.courseId = courseId;
  }

  /**
   * Fetch canvas metadata only (lightweight, for initial loading)
   */
  public async fetchCanvasMetadata(courseId: string): Promise<CanvasMetadata[]> {
    // Check cache first
    if (this.metadataCache.has(courseId)) {
      console.log('📋 Using cached metadata for course:', courseId);
      return this.metadataCache.get(courseId)!;
    }

    try {
      console.log('📋 Fetching canvas metadata for course:', courseId);
      
      const { data, error } = await supabase
        .from('canvases')
        .select('id, canvas_metadata, lesson_number, canvas_index, course_id')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true })
        .order('canvas_index', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch canvas metadata: ${error.message}`);
      }

      const metadata = data?.map(row => ({
        id: row.id,
        lesson_number: row.lesson_number,
        canvas_index: row.canvas_index,
        course_id: row.course_id,
        ...row.canvas_metadata
      })) || [];

      // Cache the metadata
      this.metadataCache.set(courseId, metadata);
      
      console.log(`✅ Fetched metadata for ${metadata.length} canvases`);
      return metadata;
    } catch (error) {
      console.error('❌ Failed to fetch canvas metadata:', error);
      throw error;
    }
  }

  /**
   * Fetch canvases with pagination
   */
  public async fetchCourseCanvasesPaginated(
    courseId: string, 
    limit: number = 10,
    offset: number = 0
  ): Promise<{ canvases: CanvasRow[], total: number }> {
    try {
      console.log(`📚 Fetching canvases for course: ${courseId} (limit: ${limit}, offset: ${offset})`);
      
      const { data: canvasRows, error, count } = await supabase
        .from('canvases')
        .select('*', { count: 'exact' })
        .eq('course_id', courseId)
        .range(offset, offset + limit - 1)
        .order('lesson_number', { ascending: true })
        .order('canvas_index', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch canvases: ${error.message}`);
      }

      const canvases = canvasRows || [];
      
      // Cache individual canvases
      canvases.forEach(canvas => {
        this.canvasCache.set(canvas.id, canvas);
      });

      console.log(`✅ Fetched ${canvases.length} canvases (total: ${count || 0})`);
      return { canvases, total: count || 0 };
    } catch (error) {
      console.error('❌ Failed to fetch canvases:', error);
      throw error;
    }
  }

  /**
   * Fetch all canvas rows for a course (legacy method for backward compatibility)
   */
  public async fetchCourseCanvases(courseId: string): Promise<CanvasRow[]> {
    try {
      console.log('📚 Fetching ALL canvases for course:', courseId);
      
      const { data: canvasRows, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true })
        .order('canvas_index', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch canvases: ${error.message}`);
      }

      const canvases = canvasRows || [];
      
      // Cache all canvases
      canvases.forEach(canvas => {
        this.canvasCache.set(canvas.id, canvas);
      });

      console.log(`📄 Fetched ${canvases.length} canvases`);
      return canvases;

    } catch (error) {
      console.error('❌ Failed to fetch course canvases:', error);
      throw error;
    }
  }

  /**
   * Create a new canvas row
   */
  public async createCanvas(canvasData: Partial<CanvasRow>): Promise<CanvasRow> {
    if (!this.courseId) {
      throw new Error('Course ID not set');
    }

    try {
      const newCanvas: Partial<CanvasRow> = {
        course_id: this.courseId,
        lesson_number: 1,
        canvas_index: 1,
        canvas_data: {
          layout: null,
          content: [],
          metadata: {}
        },
        canvas_metadata: {
          title: 'New Canvas',
          template: 'default',
          dimensions: { width: 1200, height: 1800 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        ...canvasData
      };

      const { data, error } = await supabase
        .from('canvases')
        .insert([newCanvas])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create canvas: ${error.message}`);
      }

      console.log('✅ Created new canvas:', data.id);
      return data;

    } catch (error) {
      console.error('❌ Failed to create canvas:', error);
      throw error;
    }
  }

  /**
   * Update an existing canvas
   */
  public async updateCanvas(canvasId: string, updates: Partial<CanvasRow>): Promise<CanvasRow> {
    try {
      const updateData = {
        ...updates,
        canvas_metadata: {
          ...updates.canvas_metadata,
          updated_at: new Date().toISOString()
        }
      };

      const { data, error } = await supabase
        .from('canvases')
        .update(updateData)
        .eq('id', canvasId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update canvas: ${error.message}`);
      }

      console.log('✅ Updated canvas:', canvasId);
      return data;

    } catch (error) {
      console.error('❌ Failed to update canvas:', error);
      throw error;
    }
  }

  /**
   * Save canvas data (layout and content)
   */
  public async saveCanvasData(canvasId: string, canvasData: CanvasData): Promise<void> {
    try {
      const { error } = await supabase
        .from('canvases')
        .update({
          canvas_data: canvasData,
          canvas_metadata: {
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', canvasId);

      if (error) {
        throw new Error(`Failed to save canvas data: ${error.message}`);
      }

      console.log('💾 Saved canvas data for:', canvasId);

    } catch (error) {
      console.error('❌ Failed to save canvas data:', error);
      throw error;
    }
  }

  /**
   * Delete a canvas
   */
  public async deleteCanvas(canvasId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('canvases')
        .delete()
        .eq('id', canvasId);

      if (error) {
        throw new Error(`Failed to delete canvas: ${error.message}`);
      }

      console.log('🗑️ Deleted canvas:', canvasId);

    } catch (error) {
      console.error('❌ Failed to delete canvas:', error);
      throw error;
    }
  }

  /**
   * Get canvas by ID (with caching)
   */
  public async getCanvasById(canvasId: string): Promise<CanvasRow | null> {
    // Check cache first
    if (this.canvasCache.has(canvasId)) {
      console.log('📋 Using cached canvas:', canvasId);
      return this.canvasCache.get(canvasId)!;
    }

    try {
      console.log('📋 Fetching canvas by ID:', canvasId);
      
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('id', canvasId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Canvas not found
        }
        console.error('❌ Error fetching canvas:', error);
        return null;
      }

      // Cache the canvas
      this.canvasCache.set(canvasId, data);
      
      console.log('✅ Fetched canvas:', canvasId);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch canvas:', error);
      return null;
    }
  }

  /**
   * Get canvases by lesson number
   */
  public async getCanvasesByLesson(courseId: string, lessonNumber: number): Promise<CanvasRow[]> {
    try {
      const { data: canvasRows, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('course_id', courseId)
        .eq('lesson_number', lessonNumber)
        .order('canvas_index', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch canvases for lesson: ${error.message}`);
      }

      return canvasRows || [];

    } catch (error) {
      console.error('❌ Failed to fetch canvases by lesson:', error);
      throw error;
    }
  }

  /**
   * Get next available canvas index for a lesson
   */
  public async getNextCanvasIndex(courseId: string, lessonNumber: number): Promise<number> {
    try {
      const { data: canvasRows, error } = await supabase
        .from('canvases')
        .select('canvas_index')
        .eq('course_id', courseId)
        .eq('lesson_number', lessonNumber)
        .order('canvas_index', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Failed to get next canvas index: ${error.message}`);
      }

      if (!canvasRows || canvasRows.length === 0) {
        return 1; // First canvas for this lesson
      }

      return canvasRows[0].canvas_index + 1;

    } catch (error) {
      console.error('❌ Failed to get next canvas index:', error);
      throw error;
    }
  }

  /**
   * Parse canvas data from JSONB
   */
  public parseCanvasData(canvasData: any): CanvasData {
    try {
      if (typeof canvasData === 'string') {
        return JSON.parse(canvasData);
      }
      return canvasData || { layout: null, content: [], metadata: {} };
    } catch (error) {
      console.warn('⚠️ Failed to parse canvas data:', error);
      return { layout: null, content: [], metadata: {} };
    }
  }

  /**
   * Serialize canvas data to JSONB
   */
  public serializeCanvasData(canvasData: CanvasData): any {
    try {
      return JSON.stringify(canvasData);
    } catch (error) {
      console.warn('⚠️ Failed to serialize canvas data:', error);
      return null;
    }
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): any {
    return {
      courseId: this.courseId,
      initialized: !!this.courseId
    };
  }
}
