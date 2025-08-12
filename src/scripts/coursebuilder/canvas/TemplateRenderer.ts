/**
 * Template Renderer
 * Handles loading and applying template configuration to layout blocks
 */

import { supabase } from '../../backend/supabase';
import type { RenderedBlock } from '../layout/LayoutTypes';

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

        // Generate input field definitions based on configuration
        const inputFields = this.generateInputFields(templateBlock);
        
        // Update areas with input field information
        // Only assign to content areas (not instruction areas)
        const updatedAreas = renderedBlock.areas.map(area => {
          const shouldHaveContent = area.areaId === 'header-content-area' || 
                                    area.areaId === 'footer-content-area' ||
                                    area.areaId.includes('content-area');
          
          console.log(`📝 Area "${area.areaId}" in block "${renderedBlock.blockId}": shouldHaveContent=${shouldHaveContent}, inputFields=${inputFields.length}`);
          
          return {
            ...area,
            content: shouldHaveContent && inputFields.length > 0 ? inputFields : area.content,
            inputFields: shouldHaveContent ? inputFields : undefined
          };
        });

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
   * Generate input field definitions based on template configuration
   */
  private static generateInputFields(templateBlock: any): any[] {
    const config = templateBlock.config;
    const fields: any[] = [];

    // Convert config keys to input field definitions
    for (const [key, enabled] of Object.entries(config)) {
      if (enabled) {
        const inputType = this.getInputTypeForField(key);
        const label = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        
        fields.push({
          key: key,
          label: label,
          inputType: inputType,
          placeholder: this.getPlaceholderForField(key),
          required: this.isFieldRequired(key)
        });
      }
    }

    return fields;
  }

  /**
   * Get placeholder text for a field
   */
  private static getPlaceholderForField(fieldKey: string): string {
    const placeholders: Record<string, string> = {
      'course_title': 'Enter course name...',
      'lesson_title': 'Enter lesson title...',
      'module_title': 'Enter module name...',
      'teacher_name': 'Enter teacher name...',
      'lesson_number': 'Enter lesson number...',
      'institution_name': 'Enter school/institution...',
      'task': 'Describe the main task...',
      'topic': 'Enter lesson topic...',
      'objective': 'State learning objective...',
      'competence': 'Define competence goals...',
      'page_number': 'Page #',
      'copyright': '© 2025 Institution Name'
    };

    return placeholders[fieldKey] || `Enter ${fieldKey.replace(/_/g, ' ')}...`;
  }

  /**
   * Check if a field is required
   */
  private static isFieldRequired(fieldKey: string): boolean {
    const requiredFields = [
      'course_title', 'lesson_title', 'teacher_name', 'institution_name'
    ];
    
    return requiredFields.includes(fieldKey);
  }

  /**
   * Determine the input type for a template field
   */
  private static getInputTypeForField(fieldKey: string): string {
    // Text inputs
    const textFields = [
      'course_title', 'lesson_title', 'module_title', 'teacher_name', 
      'institution_name', 'task', 'topic', 'objective', 'competence',
      'type', 'state', 'origin', 'quality', 'concepts', 'terminology',
      'historical_figures', 'student_area', 'teacher_area', 
      'student_title', 'teacher_title', 'instruction_area', 
      'instruction_title', 'copyright'
    ];

    // Number inputs
    const numberFields = [
      'lesson_number', 'page_number'
    ];

    // Boolean/checkbox inputs
    const booleanFields = [
      'include_glossary'
    ];

    // Date inputs
    const dateFields = [
      'created_at', 'updated_at'
    ];

    // Determine input type
    if (textFields.includes(fieldKey)) {
      return 'text';
    } else if (numberFields.includes(fieldKey)) {
      return 'number';
    } else if (booleanFields.includes(fieldKey)) {
      return 'checkbox';
    } else if (dateFields.includes(fieldKey)) {
      return 'date';
    } else {
      // Default to text for unknown fields
      return 'text';
    }
  }
}
