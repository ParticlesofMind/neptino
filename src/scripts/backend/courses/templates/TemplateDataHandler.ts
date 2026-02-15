import { supabase } from "../../supabase";
import { TemplateData, TemplateBlock, TemplateBlockType, TemplateType } from "./types";
import { TemplateConfigManager } from "./TemplateConfigManager";
import { BLOCK_CONTENT_TEMPLATES, TEMPLATE_BLOCK_SEQUENCES, TEMPLATE_BODY_BLOCKS } from "./templateOptions";

export class TemplateDataHandler {
  static async loadExistingTemplates(): Promise<any[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("templates")
        .select(
          "id, template_id, template_type, template_description, created_at, template_data",
        )
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Failed to load templates:", error);
      return [];
    }
  }

  static async loadTemplate(templateId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) {
        throw error;
      }

      // Normalize template data if needed (this modifies the data object in place)
      const normalized = TemplateConfigManager.normalizeTemplateData(data);
      if (normalized) {
        try {
          // Use the potentially modified template_data from the data object
          const templateDataToUpdate = data.template_data || data.templateData;
          if (templateDataToUpdate) {
            const { error: updateError } = await supabase
              .from("templates")
              .update({
                template_data: templateDataToUpdate,
                updated_at: new Date().toISOString(),
              })
              .eq("id", data.id);
            
            if (updateError) {
              console.error("Failed to update normalized template structure:", updateError);
              // Don't throw - this is a non-critical update
            }
          }
        } catch (normalizationError) {
          console.error("Failed to normalize template structure:", normalizationError);
          // Don't throw - normalization is optional
        }
      }

      // Get current course ID and associate template with it
      const courseId = sessionStorage.getItem("currentCourseId");
      if (courseId && data.course_id !== courseId) {
        const { error: updateError } = await supabase
          .from("templates")
          .update({ course_id: courseId })
          .eq("id", templateId);

        if (updateError) {
          console.error("Failed to associate template with course:", updateError);
        }
      }

      return data;
    } catch (error) {
      console.error("Failed to load template:", error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      } else if (error && typeof error === 'object') {
        console.error("Error details:", JSON.stringify(error, null, 2));
        if ('code' in error) console.error("Error code:", (error as any).code);
        if ('message' in error) console.error("Error message:", (error as any).message);
        if ('details' in error) console.error("Error details:", (error as any).details);
        if ('hint' in error) console.error("Error hint:", (error as any).hint);
      }
      return null;
    }
  }

  static async loadCourseTemplate(): Promise<any | null> {
    try {
      const courseId = sessionStorage.getItem("currentCourseId");

      if (!courseId) {
        // Try to get the most recent course if no courseId is set
        const { data: recentCourse, error: courseError } = await supabase
          .from("courses")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!courseError && recentCourse) {
          sessionStorage.setItem("currentCourseId", recentCourse.id);
          return this.loadCourseTemplate(); // Recursive call with course ID now set
        } else {
          return null;
        }
      }

      // Query database for template associated with this course
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("course_id", courseId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No template found for this course
          console.log("No template found for current course");
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Failed to load course template:", error);
      return null;
    }
  }

  static async createTemplate(formData: {
    name: string;
    type: TemplateType;
    description?: string;
  }): Promise<string | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Generate a unique template ID
      const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const blockSequence = TEMPLATE_BLOCK_SEQUENCES[formData.type] ?? TEMPLATE_BLOCK_SEQUENCES.lesson;
      const defaultBlocks: TemplateBlock[] = [];
      let order = 1;

      // Create main blocks (header, body, footer)
      blockSequence.forEach((blockType) => {
        const block = this.createDefaultBlock(blockType, order);
        defaultBlocks.push(block);
        order++;

        // If this is the body block, add body sub-blocks for this template type
        if (blockType === "body") {
          const bodyBlocks = TEMPLATE_BODY_BLOCKS[formData.type] ?? [];
          bodyBlocks.forEach((subBlockType) => {
            const subBlock = this.createDefaultBlock(subBlockType, order);
            defaultBlocks.push(subBlock);
            order++;
          });
        }
      });

      const templateData: TemplateData = {
        template_id: templateId,
        template_type: formData.type,
        template_description: formData.description,
        template_data: {
          name: formData.name,
          blocks: defaultBlocks,
          settings: {
            version: "1.0",
            created_at: new Date().toISOString(),
          },
        },
      };

      const { data, error } = await supabase
        .from("templates")
        .insert([
          {
            template_id: templateData.template_id,
            template_type: templateData.template_type,
            template_description: templateData.template_description,
            template_data: templateData.template_data,
            created_by: user.id,
            created_at: new Date().toISOString(),
          },
        ])
        .select("id")
        .single();

      if (error) {
        console.error("Error creating template:", error);
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error("Failed to create template:", error);
      return null;
    }
  }

  static async saveTemplateChanges(templateId: string, templateData: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("templates")
        .update({
          template_data: templateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Failed to save template changes:", error);
      return false;
    }
  }

  static async regenerateCanvasesForTemplate(templateId: string): Promise<void> {
    try {
      // This would trigger canvas regeneration for all lessons using this template
      console.log(`Regenerating canvases for template ${templateId}`);
      
      // Implementation would depend on your canvas regeneration logic
      // For now, just log the action
    } catch (error) {
      console.error("Failed to regenerate canvases:", error);
    }
  }

  private static createDefaultBlock(blockType: TemplateBlockType, order: number): TemplateBlock {
    return {
      id: `${blockType}-${order}`,
      type: blockType,
      order,
      config: this.buildDefaultBlockConfig(blockType),
      content:
        BLOCK_CONTENT_TEMPLATES[blockType] ?? `<div class="${blockType}-section">{{${blockType}}}</div>`,
    };
  }

  private static buildDefaultBlockConfig(blockType: TemplateBlockType): Record<string, boolean> {
    const fields = TemplateConfigManager.getBlockFieldConfiguration()[blockType] || [];
    return fields.reduce<Record<string, boolean>>((acc, field) => {
      if (field.separator) {
        return acc;
      }
      acc[field.name] = TemplateConfigManager.getFieldDefaultValue(field);
      return acc;
    }, {});
  }
}
