/**
 * Template Renderer
 * Handles loading and applying template configuration to layout blocks
 */

import { supabase } from '../backend/supabase.js';
import type { RenderedBlock } from './layout/LayoutTypes.js';

export class TemplateRenderer {
  /**
   * Get layout blocks with template configuration applied as field labels
   * Fetches template data directly from Supabase
   */
  static async getConfiguredLayoutBlocks(renderedBlocks: RenderedBlock[], courseId: string): Promise<RenderedBlock[]> {
    try {
      console.log('📄 Fetching template configuration for course:', courseId);

      const { data: template, error } = await supabase
        .from('templates')
        .select('template_data')
        .eq('course_id', courseId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading course template:', error);
        return renderedBlocks; // Return original blocks if error
      }

      if (!template?.template_data) {
        console.log('📄 No template found for course, returning default blocks');
        return renderedBlocks;
      }

      console.log('📄 Template data loaded:', template.template_data);

      const configuredBlocks = renderedBlocks.map(renderedBlock => {
        // Find matching template block
        const templateBlock = template.template_data.blocks.find(
          (tb: any) => tb.type === renderedBlock.blockId
        );

        if (!templateBlock) {
          return renderedBlock; // Return original if no template found
        }

        // Generate field labels based on configuration
        const fieldLabels = this.generateFieldLabels(templateBlock);
        
        // Update areas with field labels as content
        const updatedAreas = renderedBlock.areas.map(area => ({
          ...area,
          content: fieldLabels.length > 0 ? fieldLabels.join(' | ') : null
        }));

        return {
          ...renderedBlock,
          areas: updatedAreas
        };
      });

      console.log('📄 Layout blocks configured with template fields');
      return configuredBlocks;

    } catch (error) {
      console.error('📄 Failed to fetch template configuration:', error);
      return renderedBlocks; // Return original blocks on error
    }
  }

  /**
   * Generate field labels based on template configuration
   */
  private static generateFieldLabels(templateBlock: any): string[] {
    const config = templateBlock.config;
    const labels: string[] = [];

    // Convert config keys to readable labels
    for (const [key, enabled] of Object.entries(config)) {
      if (enabled) {
        const label = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        labels.push(label);
      }
    }

    return labels;
  }
}
