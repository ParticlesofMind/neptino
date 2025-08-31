import type { TemplateBlock } from '../../backend/courses/templates/createTemplate.js';
import { supabase } from '../../backend/supabase.js';

export interface ColumnConfiguration {
  headerColumns: number;
  footerColumns: number;
  headerFields: string[];
  footerFields: string[];
}

export class DynamicColumnCalculator {
  private static templateCache: Map<string, any> = new Map();

  /**
   * Gets the number of columns needed for header and footer based on template configuration
   */
  static async calculateColumns(templateId?: string): Promise<ColumnConfiguration> {
    try {
      const templateData = await this.getTemplateData(templateId);
      
      if (!templateData) {
        // Return default configuration if no template data
        return this.getDefaultConfiguration();
      }

      const headerConfig = this.calculateHeaderColumns(templateData);
      const footerConfig = this.calculateFooterColumns(templateData);

      return {
        headerColumns: headerConfig.columns,
        footerColumns: footerConfig.columns,
        headerFields: headerConfig.fields,
        footerFields: footerConfig.fields
      };
    } catch (error) {
      console.error('Error calculating columns:', error);
      return this.getDefaultConfiguration();
    }
  }

  /**
   * Gets template data from cache or database
   */
  private static async getTemplateData(templateId?: string): Promise<any> {
    // If no templateId provided, try to get from current course
    if (!templateId) {
      const courseTemplateId = await this.getCurrentCourseTemplateId();
      templateId = courseTemplateId || undefined;
    }

    if (!templateId) {
      return null;
    }

    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId);
    }

    try {
      const { data, error } = await supabase
        .from('templates')
        .select('template_data')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      // Cache the result
      this.templateCache.set(templateId, data);
      return data;
    } catch (error) {
      console.error('Error fetching template data:', error);
      return null;
    }
  }

  /**
   * Gets the template ID for the current course
   */
  private static async getCurrentCourseTemplateId(): Promise<string | null> {
    try {
      const courseId = sessionStorage.getItem('currentCourseId');
      if (!courseId) return null;

      const { data, error } = await supabase
        .from('templates')
        .select('id')
        .eq('course_id', courseId)
        .single();

      if (error) return null;
      return data.id;
    } catch (error) {
      console.error('Error getting current course template ID:', error);
      return null;
    }
  }

  /**
   * Calculates the number of columns needed for the header
   */
  private static calculateHeaderColumns(templateData: any): { columns: number; fields: string[] } {
    const headerBlock = this.findBlockByType(templateData, 'header');
    if (!headerBlock) {
      return { columns: 5, fields: ['lesson_number', 'lesson_title', 'module_title', 'course_title', 'institution_name'] };
    }

    const enabledFields = this.getEnabledFields(headerBlock, this.getHeaderFieldConfig());
    return {
      columns: Math.max(1, Math.min(12, enabledFields.length)), // Between 1-12 columns
      fields: enabledFields
    };
  }

  /**
   * Calculates the number of columns needed for the footer
   */
  private static calculateFooterColumns(templateData: any): { columns: number; fields: string[] } {
    const footerBlock = this.findBlockByType(templateData, 'footer');
    if (!footerBlock) {
      return { columns: 2, fields: ['copyright', 'page_number'] };
    }

    const enabledFields = this.getEnabledFields(footerBlock, this.getFooterFieldConfig());
    return {
      columns: Math.max(1, Math.min(12, enabledFields.length)), // Between 1-12 columns
      fields: enabledFields
    };
  }

  /**
   * Finds a block by type in the template data
   */
  private static findBlockByType(templateData: any, blockType: string): TemplateBlock | null {
    const blocks = templateData?.template_data?.blocks || [];
    return blocks.find((block: TemplateBlock) => block.type === blockType) || null;
  }

  /**
   * Gets the enabled fields from a block configuration
   */
  private static getEnabledFields(block: TemplateBlock, fieldConfig: any[]): string[] {
    const enabledFields: string[] = [];
    
    fieldConfig.forEach(field => {
      // Include mandatory fields or fields that are explicitly enabled
      if (field.mandatory || (block.config && block.config[field.name] === true)) {
        enabledFields.push(field.name);
      }
    });

    return enabledFields;
  }

  /**
   * Gets the header field configuration (matches createTemplate.ts)
   */
  private static getHeaderFieldConfig() {
    return [
      { name: 'lesson_number', label: 'Lesson number (#)', mandatory: true },
      { name: 'lesson_title', label: 'Lesson title', mandatory: true },
      { name: 'module_title', label: 'Module title', mandatory: true },
      { name: 'course_title', label: 'Course title', mandatory: true },
      { name: 'institution_name', label: 'Institution name', mandatory: true },
      { name: 'teacher_name', label: 'Teacher name', mandatory: false }
    ];
  }

  /**
   * Gets the footer field configuration (matches createTemplate.ts)
   */
  private static getFooterFieldConfig() {
    return [
      { name: 'copyright', label: 'Copyright', mandatory: true },
      { name: 'teacher_name', label: 'Teacher name', mandatory: false },
      { name: 'institution_name', label: 'Institution name', mandatory: false },
      { name: 'page_number', label: 'Page number (#)', mandatory: true }
    ];
  }

  /**
   * Gets the default column configuration when no template data is available
   */
  private static getDefaultConfiguration(): ColumnConfiguration {
    return {
      headerColumns: 5, // All mandatory header fields
      footerColumns: 2, // Only mandatory footer fields
      headerFields: ['lesson_number', 'lesson_title', 'module_title', 'course_title', 'institution_name'],
      footerFields: ['copyright', 'page_number']
    };
  }

  /**
   * Clears the template cache (useful when templates are updated)
   */
  static clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Calculates optimal column distribution for a given number of fields
   * Returns an array of column widths that sum to 12
   */
  static calculateColumnDistribution(fieldCount: number): number[] {
    if (fieldCount === 0) return [];
    if (fieldCount === 1) return [12];
    if (fieldCount === 2) return [6, 6];
    if (fieldCount === 3) return [4, 4, 4];
    if (fieldCount === 4) return [3, 3, 3, 3];
    if (fieldCount === 5) return [2, 3, 2, 3, 2]; // Slightly uneven but balanced
    if (fieldCount === 6) return [2, 2, 2, 2, 2, 2];
    
    // For 7+ fields, distribute as evenly as possible
    const baseWidth = Math.floor(12 / fieldCount);
    const remainder = 12 % fieldCount;
    const distribution: number[] = [];
    
    for (let i = 0; i < fieldCount; i++) {
      distribution.push(baseWidth + (i < remainder ? 1 : 0));
    }
    
    return distribution;
  }

  /**
   * Gets column configuration with distribution for layout rendering
   */
  static async getLayoutConfiguration(templateId?: string): Promise<{
    header: { columns: number; fields: string[]; distribution: number[] };
    footer: { columns: number; fields: string[]; distribution: number[] };
  }> {
    const config = await this.calculateColumns(templateId);
    
    return {
      header: {
        columns: config.headerColumns,
        fields: config.headerFields,
        distribution: this.calculateColumnDistribution(config.headerColumns)
      },
      footer: {
        columns: config.footerColumns,
        fields: config.footerFields,
        distribution: this.calculateColumnDistribution(config.footerColumns)
      }
    };
  }
}
