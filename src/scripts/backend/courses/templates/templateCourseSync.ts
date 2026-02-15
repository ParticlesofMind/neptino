import { supabase } from "../../supabase";
import { getCourseId } from "../../../utils/courseId";

function resolveCourseId(): string | null {
  const idFromUrl = getCourseId();
  if (idFromUrl) {
    return idFromUrl;
  }

  if (typeof window !== "undefined") {
    return (
      (window as any).currentCourseId ||
      sessionStorage.getItem("currentCourseId") ||
      null
    );
  }

  return null;
}

export async function syncTemplateSettingsWithCourse(
  templateRecord: any,
): Promise<void> {
  try {
    const courseId = resolveCourseId();
    if (!courseId) {
      console.warn("🧩 Template sync skipped - no course ID available");
      return;
    }

    if (!templateRecord) {
      return;
    }

    const templateData = templateRecord.template_data || templateRecord;
    if (!templateData) {
      return;
    }

    const blocks =
      Array.isArray(templateData.blocks) && templateData.blocks.length > 0
        ? templateData.blocks.map((block: any) => ({
            type: block.type,
            enabledFields: Object.entries(block.config || {})
              .filter(([, enabled]) => Boolean(enabled))
              .map(([name]) => name),
          }))
        : [];

    const payload = {
      active_template_id:
        templateRecord.id || templateRecord.template_id || null,
      template_type:
        templateRecord.template_type || templateData.template_type || null,
      template_description:
        templateRecord.template_description ||
        templateData.template_description ||
        null,
      blocks,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("courses")
      .update({ template_settings: payload })
      .eq("id", courseId);

    if (error) {
      console.error("Failed to sync template settings with course:", error);
    } else {
      console.log("🧩 Template settings synced with course:", payload);
    }
  } catch (error) {
    console.error("Unexpected error syncing template settings:", error);
  }
}
