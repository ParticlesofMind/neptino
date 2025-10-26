import { supabase } from "../../supabase.js";
import { TemplateData, TemplateBlock, TemplateBlockType, TemplateType } from "./types.js";
import { TemplateConfigManager } from "./TemplateConfigManager.js";
import { BLOCK_CONTENT_TEMPLATES, TEMPLATE_BLOCK_SEQUENCES } from "./templateOptions.js";

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

      const normalized = TemplateConfigManager.normalizeTemplateData(data);
      if (normalized) {
        try {
          await supabase
            .from("templates")
            .update({
              template_data: data.template_data,
              updated_at: new Date().toISOString(),
            })
            .eq("id", data.id);
        } catch (normalizationError) {
          console.error("Failed to normalize template structure:", normalizationError);
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
      const defaultBlocks: TemplateBlock[] = blockSequence.map((blockType, index) =>
        this.createDefaultBlock(blockType, index + 1),
      );

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
      acc[field.name] = field.mandatory ? true : false;
      return acc;
    }, {});
  }
}
