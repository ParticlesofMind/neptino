import { supabase } from "../../supabase.js";
import { getCourseId } from "../../../utils/courseId.js";

type OptionalContextKey = "ai-context-schedule" | "ai-context-structure" | "ai-context-existing";

interface GenerationSettingsPayload {
  required_context: string[];
  optional_context: Record<string, boolean>;
  last_action?: string;
  updated_at: string;
}

class GenerationSettingsHandler {
  private form: HTMLFormElement | null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastSerializedPayload = "";
  private statusCard: HTMLElement | null = null;

  constructor() {
    this.form = document.getElementById(
      "generation-settings-form",
    ) as HTMLFormElement | null;
    if (!this.form) {
      return;
    }

    this.statusCard = document.getElementById("generation-save-status");
    this.registerEvents();
    void this.loadExistingSettings();
  }

  private registerEvents(): void {
    const optionalCheckboxes = this.form!.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"][name^="ai-context-"]',
    );

    optionalCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => this.scheduleSave());
    });

    const actionButtons = this.form!.querySelectorAll<HTMLButtonElement>(
      "[data-ai-generate]",
    );
    actionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.aiGenerate;
        void this.saveSettings(action || undefined);
      });
    });
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.setStatus("saving", "Saving preferences…");
    this.saveTimeout = setTimeout(() => {
      void this.saveSettings();
    }, 400);
  }

  private getOptionalContext(): Record<OptionalContextKey, boolean> {
    const keys: OptionalContextKey[] = [
      "ai-context-schedule",
      "ai-context-structure",
      "ai-context-existing",
    ];

    const result: Record<OptionalContextKey, boolean> = {
      "ai-context-schedule": true,
      "ai-context-structure": true,
      "ai-context-existing": false,
    };

    keys.forEach((key) => {
      const checkbox = this.form!.querySelector<HTMLInputElement>(
        `input[name="${key}"]`,
      );
      if (checkbox) {
        result[key] = checkbox.checked;
      }
    });

    return result;
  }

  private buildPayload(lastAction?: string): GenerationSettingsPayload {
    const optional = this.getOptionalContext();
    return {
      required_context: ["essentials", "classification", "pedagogy"],
      optional_context: {
        schedule: optional["ai-context-schedule"],
        structure: optional["ai-context-structure"],
        existing: optional["ai-context-existing"],
      },
      last_action: lastAction,
      updated_at: new Date().toISOString(),
    };
  }

  private async saveSettings(lastAction?: string): Promise<void> {
    const courseId = getCourseId() || sessionStorage.getItem("currentCourseId");
    if (!courseId) {
      this.setStatus("empty", "Create a course to enable AI generation");
      return;
    }

    const payload = this.buildPayload(lastAction);
    const serialized = JSON.stringify(payload);
    if (serialized === this.lastSerializedPayload) {
      this.setStatus("saved");
      return;
    }

    try {
      const { error } = await supabase
        .from("courses")
        .update({ generation_settings: payload })
        .eq("id", courseId);

      if (error) {
        throw error;
      }

      this.lastSerializedPayload = serialized;
      this.setStatus("saved");
    } catch (error) {
      console.error("Failed to save generation settings:", error);
      this.setStatus("error", "Failed to save preferences");
    }
  }

  private async loadExistingSettings(): Promise<void> {
    const courseId = getCourseId() || sessionStorage.getItem("currentCourseId");
    if (!courseId) {
      this.setStatus("empty", "Create a course to enable AI generation");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("generation_settings")
        .eq("id", courseId)
        .single();

      if (error) {
        throw error;
      }

      const settings: GenerationSettingsPayload | null =
        data?.generation_settings || null;
      if (settings?.optional_context) {
        (
          [
            ["ai-context-schedule", settings.optional_context.schedule],
            ["ai-context-structure", settings.optional_context.structure],
            ["ai-context-existing", settings.optional_context.existing],
          ] as Array<[OptionalContextKey, boolean]>
        ).forEach(([name, value]) => {
          const checkbox = this.form!.querySelector<HTMLInputElement>(
            `input[name="${name}"]`,
          );
          if (checkbox) {
            checkbox.checked = Boolean(value);
          }
        });

        this.lastSerializedPayload = JSON.stringify(settings);
        this.setStatus("saved");
      } else {
        this.setStatus("empty", "Select optional context to personalize AI runs");
      }
    } catch (error) {
      console.error("Failed to load generation settings:", error);
      this.setStatus("error", "Unable to load preferences");
    }
  }

  private setStatus(
    status: "empty" | "saving" | "saved" | "error",
    message?: string,
  ): void {
    if (!this.statusCard) return;
    this.statusCard.dataset.status = status;
    const textElement = this.statusCard.querySelector(
      ".card__text",
    ) as HTMLElement | null;
    if (!textElement) return;

    if (message) {
      textElement.textContent = message;
      return;
    }

    switch (status) {
      case "saving":
        textElement.textContent = "Saving preferences…";
        break;
      case "saved":
        textElement.textContent = `Last Saved: ${new Date().toLocaleString()}`;
        break;
      case "empty":
        textElement.textContent = "No data submitted yet";
        break;
      case "error":
        textElement.textContent = "Failed to save preferences";
        break;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new GenerationSettingsHandler();
});
