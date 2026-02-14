import { dispatchProfilesIndexed } from "./studentsProfileService.js";
import { parseGoogleSheet, parseRosterFile } from "./studentsParser.js";
import { StudentsPreview } from "./studentsPreview.js";
import { StudentsRepository } from "./studentsRepository.js";
import {
  STUDENT_FIELD_LABELS,
  type RawStudentRow,
  type StudentField,
  type StudentFieldMapping,
  type StudentParseResult,
  type StudentRecord,
  type StudentTransformResult,
} from "./studentsTypes.js";
import {
  ensureStudentId,
  parseAssessment,
  parseLearningStyle,
  sanitiseValue,
} from "./studentsUtils.js";
import { setElementHidden } from "../../../utils/tailwindState";

interface UploadManagerOptions {
  preview: StudentsPreview;
  repository: StudentsRepository;
  onCourseIdMissing: () => void;
  onActivity: (message: string) => void;
  onSuccess: () => void;
  onStatusChange?: (state: "saving" | "saved" | "error", message?: string) => void;
}

const REQUIRED_FIELDS: StudentField[] = ["first_name", "last_name"];

export class StudentsUploadManager {
  private readonly form: HTMLFormElement | null;
  private readonly feedback: HTMLElement | null;
  private readonly mappingSection: HTMLElement | null;
  private readonly mappingGrid: HTMLElement | null;
  private readonly submitButton: HTMLButtonElement | null;
  private readonly status: HTMLElement | null;
  private readonly spinner: HTMLElement | null;
  private currentParse: StudentParseResult | null = null;
  private currentMapping: StudentFieldMapping = {};
  private sourceLabel = "file";

  constructor(private readonly options: UploadManagerOptions) {
    this.form = document.getElementById("students-upload-form") as HTMLFormElement | null;
    this.feedback = document.getElementById("students-upload-feedback");
    this.mappingSection = document.getElementById("students-mapping");
    this.mappingGrid = document.getElementById("students-mapping-grid");
    this.submitButton = document.getElementById("students-upload-submit-btn") as HTMLButtonElement | null;
    this.status = document.getElementById("students-upload-status");
    this.spinner = this.status?.querySelector("[data-students-upload-spinner]") ?? null;
  }

  public init(): void {
    if (!this.form) return;

    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.handleSubmit();
    });

    const fileInput = document.getElementById("students-upload-input") as HTMLInputElement | null;
    fileInput?.addEventListener("change", () => void this.handleFileSelect(fileInput.files));

    const fetchSheets = document.getElementById("students-fetch-sheets-btn");
    fetchSheets?.addEventListener("click", () => void this.handleGoogleSheetsFetch());

    const helpBtn = document.getElementById("students-sheets-help-btn");
    helpBtn?.addEventListener("click", () => {
      this.showFeedback(
        "Share your sheet with \"Anyone with the link\" and copy the URL from your browser address bar.",
        "warning",
      );
    });
  }

  private async handleFileSelect(fileList: FileList | null): Promise<void> {
    this.clearFeedback();
    this.resetMapping();

    if (!fileList?.length) {
      this.showFeedback("Select a file to continue.", "warning");
      return;
    }

    const file = fileList[0];
    try {
      this.setBusy(true);
      this.currentParse = await parseRosterFile(file);
      this.sourceLabel = file.name;
      this.applyParseResult("File parsed successfully.");
    } catch (error) {
      console.error("Failed to parse roster file:", error);
      this.showFeedback("We could not read that file. Try a different format or check that it's not encrypted.", "error");
      this.currentParse = null;
    } finally {
      this.setBusy(false);
    }
  }

  private async handleGoogleSheetsFetch(): Promise<void> {
    this.clearFeedback();
    this.resetMapping();

    const urlInput = document.getElementById("students-sheets-url") as HTMLInputElement | null;
    const url = urlInput?.value.trim();
    if (!url) {
      this.showFeedback("Paste a Google Sheets link to import.", "warning");
      return;
    }

    try {
      this.setBusy(true);
      this.currentParse = await parseGoogleSheet(url);
      this.sourceLabel = "Google Sheets";
      this.applyParseResult("Google Sheet fetched successfully.");
    } catch (error) {
      console.error("Failed to fetch Google Sheet:", error);
      this.showFeedback("We could not download that sheet. Check that the link is public and try again.", "error");
      this.currentParse = null;
    } finally {
      this.setBusy(false);
    }
  }

  private applyParseResult(successMessage: string): void {
    if (!this.currentParse) return;

    this.currentMapping = { ...this.currentParse.mapping };
    const requiresMapping = !REQUIRED_FIELDS.every((field) => Boolean(this.currentMapping[field]));
    this.renderMappingControls(this.currentParse.headers);
    this.toggleMapping(requiresMapping);

    if (this.currentParse.warnings.length) {
      this.showFeedback(this.currentParse.warnings.join(" "), "warning");
    } else {
      this.showFeedback(successMessage, "success");
    }

    if (this.submitButton) {
      this.submitButton.disabled = false;
    }
  }

  private renderMappingControls(headers: string[]): void {
    if (!this.mappingGrid) return;

    this.mappingGrid.innerHTML = "";
    headers.forEach((header, index) => {
      headers[index] = header.trim();
    });

    STUDENT_FIELD_LABELS.forEach(({ field, label }) => {
      const wrapper = document.createElement("label");
      wrapper.className = "flex flex-col gap-2 text-sm font-medium text-neutral-700";
      wrapper.innerHTML = `
        ${label}${REQUIRED_FIELDS.includes(field) ? "*" : ""}
        <select class="w-full rounded-md border-0 py-2 text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600" data-field="${field}">
          <option value="">Not mapped</option>
          ${headers
            .map(
              (header) =>
                `<option value="${header}" ${
                  this.currentMapping[field] === header ? "selected" : ""
                }>${header}</option>`,
            )
            .join("")}
        </select>
      `;

      const select = wrapper.querySelector("select");
      select?.addEventListener("change", (event) => {
        const target = event.target as HTMLSelectElement;
        const selectedField = target.dataset.field as StudentField;
        if (target.value) {
          this.currentMapping[selectedField] = target.value;
        } else {
          delete this.currentMapping[selectedField];
        }
      });

      this.mappingGrid?.appendChild(wrapper);
    });
  }

  private toggleMapping(visible: boolean): void {
    if (!this.mappingSection) return;
    this.mappingSection.hidden = !visible;
  }

  private resetMapping(): void {
    this.currentMapping = {};
    this.mappingGrid && (this.mappingGrid.innerHTML = "");
    this.toggleMapping(false);
    if (this.submitButton) {
      this.submitButton.disabled = true;
    }
  }

  private showFeedback(message: string, tone: "success" | "error" | "warning"): void {
    if (!this.feedback) return;
    this.feedback.hidden = false;
    this.feedback.dataset.state = tone;
    this.feedback.textContent = message;
  }

  private clearFeedback(): void {
    if (!this.feedback) return;
    this.feedback.hidden = true;
    this.feedback.textContent = "";
    delete this.feedback.dataset.state;
  }

  private setBusy(isBusy: boolean): void {
    if (this.status) {
      this.status.hidden = !isBusy; // Keep the original hidden logic
    }
    if (this.submitButton) {
      this.submitButton.disabled = isBusy;
    }
    if (this.form) {
      this.form.classList.toggle('opacity-60', isBusy);
      this.form.classList.toggle('pointer-events-none', isBusy);
    }
    if (this.spinner) {
      setElementHidden(this.spinner, !isBusy); // Use Tailwind utility for visibility
    }
  }

  private validateMapping(): boolean {
    if (!this.currentParse) return false;
    const missing = REQUIRED_FIELDS.filter((field) => !this.currentMapping[field]);
    if (missing.length) {
      this.showFeedback(
        `Map the required fields: ${missing
          .map((field) => field.replace("_", " "))
          .join(", ")}.`,
        "warning",
      );
      this.toggleMapping(true);
      return false;
    }
    return true;
  }

  private transformRows(): StudentTransformResult {
    if (!this.currentParse) {
      return { students: [], invalidRows: [], warnings: [] };
    }

    const students: StudentRecord[] = [];
    const invalidRows: number[] = [];
    const warnings: string[] = [];

    this.currentParse.rows.forEach((row, index) => {
      const student = this.buildStudentFromRow(row);
      if (!student) {
        invalidRows.push(index + 2); // +2 accounts for header row + 1-based index
        return;
      }
      students.push(student);
    });

    if (invalidRows.length) {
      warnings.push(
        `Skipped ${invalidRows.length} row${invalidRows.length === 1 ? "" : "s"} missing required data (rows ${invalidRows.join(
          ", ",
        )}).`,
      );
    }

    return { students, invalidRows, warnings };
  }

  private buildStudentFromRow(row: RawStudentRow): StudentRecord | null {
    const firstNameValue = sanitiseValue(this.getMappedValue(row, "first_name"));
    const lastNameValue = sanitiseValue(this.getMappedValue(row, "last_name"));
    if (!firstNameValue || !lastNameValue) {
      return null;
    }

    const email = sanitiseValue(this.getMappedValue(row, "email"));
    const studentId = sanitiseValue(this.getMappedValue(row, "student_id"));
    const gradeLevel = sanitiseValue(this.getMappedValue(row, "grade_level"));
    const learningStyleValue = sanitiseValue(this.getMappedValue(row, "learning_style"));
    const scoreValue = sanitiseValue(this.getMappedValue(row, "assessment_score"));
    const enrollmentDateValue = sanitiseValue(this.getMappedValue(row, "enrollment_date"));
    const notesValue = sanitiseValue(this.getMappedValue(row, "notes"));

    return {
      first_name: firstNameValue,
      last_name: lastNameValue,
      email: email || null,
      student_id: studentId || ensureStudentId(),
      grade_level: gradeLevel || null,
      learning_style: parseLearningStyle(learningStyleValue),
      assessment_score: parseAssessment(scoreValue),
      enrollment_date: enrollmentDateValue || null,
      notes: notesValue || null,
    };
  }

  private getMappedValue(row: RawStudentRow, field: StudentField): unknown {
    const header = this.currentMapping[field];
    if (!header) return undefined;
    return row[header];
  }

  private async handleSubmit(): Promise<void> {
    if (!this.currentParse) {
      this.showFeedback("Import a file or Google Sheet first.", "warning");
      return;
    }

    if (!this.validateMapping()) {
      return;
    }

    const courseId = this.options.repository.getCourseId();
    if (!courseId) {
      this.options.onCourseIdMissing();
      this.showFeedback("Create the course first. Save essentials to generate a course ID.", "warning");
      return;
    }

    const { students, warnings } = this.transformRows();
    if (!students.length) {
      this.showFeedback("No valid students detected. Check your mappings or fix missing names.", "warning");
      return;
    }

    this.options.onStatusChange?.("saving", "Uploading students…");
    this.setBusy(true);
    try {
      const { data, error } = await this.options.repository.upsertStudents(students);
      if (error) {
        console.error("Failed to save students:", error);
        this.showFeedback(error.message ?? "Failed to save students to Supabase.", "error");
        this.options.onStatusChange?.("error", "Failed to upload students");
        return;
      }

      const stored = data ?? students;
      this.options.preview.render(stored);
      const { data: summary } = await this.options.repository.fetchSummary();
      if (summary) {
        this.options.preview.updateSummary(summary);
      }
      dispatchProfilesIndexed(courseId, stored);

      warnings.forEach((warning) => this.options.preview.showFeedback(warning, "warning"));
      this.options.onActivity(`Imported ${stored.length} students from ${this.sourceLabel}.`);
      this.showFeedback(`Imported ${stored.length} students successfully.`, "success");
      this.form?.reset();
      this.resetMapping();
      this.currentParse = null;
      this.options.onSuccess();
      this.options.onStatusChange?.("saved");
    } finally {
      this.setBusy(false);
    }
  }
}
