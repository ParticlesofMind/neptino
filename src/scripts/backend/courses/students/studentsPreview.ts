import type { RosterSummary, StudentRecord } from "./studentsTypes.js";

export class StudentsPreview {
  private readonly previewBody: HTMLElement | null;
  private readonly emptyRow: HTMLElement | null;
  private readonly wrapper: HTMLElement | null;
  private readonly feedback: HTMLElement | null;
  private readonly totalEl: HTMLElement | null;
  private readonly gradesEl: HTMLElement | null;
  private readonly syncedEl: HTMLElement | null;
  private readonly statusEl: HTMLElement | null;
  private readonly activityList: HTMLElement | null;
  private readonly feedbackModifiers = [
    "students__feedback--success",
    "students__feedback--error",
    "students__feedback--warning",
  ];
  private onDeleteRow: ((index: number) => Promise<void>) | null = null;
  private onUpdateRow: ((index: number, updates: Partial<StudentRecord>) => Promise<void>) | null = null;

  constructor() {
    this.previewBody = document.getElementById("students-preview-body") as HTMLElement | null;
    this.emptyRow = document.getElementById("students-preview-empty") as HTMLElement | null;
    this.wrapper = document.querySelector(".students__list-wrapper");
    this.feedback = document.getElementById("students-feedback");
    this.totalEl = document.getElementById("students-count-total");
    this.gradesEl = document.getElementById("students-count-grades");
    this.syncedEl = document.getElementById("students-count-synced");
    this.statusEl = document.getElementById("students-status-text");
    this.activityList = document.getElementById("students-activity-list");
  }

  public setOnDeleteRow(callback: (index: number) => Promise<void>): void {
    this.onDeleteRow = callback;
  }

  public setOnUpdateRow(callback: (index: number, updates: Partial<StudentRecord>) => Promise<void>): void {
    this.onUpdateRow = callback;
  }

  public render(students: StudentRecord[]): void {
    if (!this.previewBody) return;

    this.setBusy(true);
    this.previewBody.innerHTML = "";

    if (!students.length) {
      if (this.emptyRow) {
        this.emptyRow.removeAttribute("hidden");
        this.previewBody.appendChild(this.emptyRow);
      }
      this.setBusy(false);
      return;
    }

    students.forEach((student, index) => {
      const row = document.createElement("div");
      row.className = "students__preview-row";
      row.dataset.studentIndex = String(index);

      const cells = [
        this.createEditableCell(student.first_name ?? "", "first_name", index),
        this.createEditableCell(student.last_name ?? "", "last_name", index),
        this.createEditableCell(student.email ?? "", "email", index),
        this.createEditableCell(student.student_id ?? "", "student_id", index),
      ];

      cells.forEach((cell) => row.appendChild(cell));

      this.previewBody?.appendChild(row);
    });

    if (this.emptyRow) {
      this.emptyRow.setAttribute("hidden", "true");
    }

    this.setBusy(false);
  }

  private createEditableCell(value: string, field: keyof StudentRecord, index: number): HTMLElement {
    const cell = document.createElement("div");
    cell.className = "students__preview-cell students__preview-cell--editable";
    
    const input = document.createElement("input");
    input.type = "text";
    input.className = "students__preview-input";
    input.value = value;
    input.dataset.field = String(field);
    input.dataset.studentIndex = String(index);

    input.addEventListener("blur", () => this.handleFieldUpdate(index, field, input.value));
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.handleFieldUpdate(index, field, input.value);
      }
    });

    cell.appendChild(input);
    return cell;
  }

  private createReadOnlyCell(value: string): HTMLElement {
    const cell = document.createElement("div");
    cell.className = "students__preview-cell students__preview-cell--readonly";
    cell.textContent = value;
    return cell;
  }

  private async handleFieldUpdate(index: number, field: keyof StudentRecord, value: string): Promise<void> {
    if (!this.onUpdateRow) return;
    try {
      await this.onUpdateRow(index, { [field]: value });
    } catch (error) {
      console.error(`Failed to update ${String(field)}:`, error);
      this.showFeedback(`Could not update student ${String(field)}.`, "error");
    }
  }

  private async handleDelete(index: number): Promise<void> {
    const confirmed = window.confirm("Are you sure you want to delete this student?");
    if (!confirmed) return;

    if (!this.onDeleteRow) return;
    try {
      await this.onDeleteRow(index);
    } catch (error) {
      console.error("Failed to delete student:", error);
      this.showFeedback("Could not delete student.", "error");
    }
  }

  public showFeedback(message: string, tone: "success" | "error" | "warning" = "success"): void {
    if (!this.feedback) return;
    this.feedback.textContent = message;
    this.feedback.hidden = false;
    this.setFeedbackTone(tone);
  }

  public clearFeedback(): void {
    if (!this.feedback) return;
    this.feedback.hidden = true;
    this.feedback.textContent = "";
    this.setFeedbackTone(null);
  }

  public updateSummary(summary: RosterSummary | null): void {
    if (!summary) return;
    if (this.totalEl) {
      this.totalEl.textContent = summary.total.toString();
    }
    if (this.gradesEl) {
      this.gradesEl.textContent = summary.gradeLevels.length
        ? summary.gradeLevels.join(", ")
        : "—";
    }
    if (this.syncedEl) {
      this.syncedEl.textContent = summary.synced.toString();
    }
    if (this.statusEl) {
      this.statusEl.textContent = summary.total
        ? "Roster is ready for Albert AI personalisation."
        : "No students imported yet. Upload a roster to get started.";
    }
  }

  private setFeedbackTone(tone: "success" | "error" | "warning" | null): void {
    if (!this.feedback) return;
    this.feedback.classList.remove(...this.feedbackModifiers);
    if (tone) {
      this.feedback.classList.add(`students__feedback--${tone}`);
    }
  }

  public appendActivity(message: string): void {
    if (!this.activityList) return;
    const li = document.createElement("li");
    li.className = "students__activity-item";
    li.textContent = `${new Date().toLocaleString()}: ${message}`;

    const emptyItem = this.activityList.querySelector(".students__activity-item--empty");
    if (emptyItem) {
      emptyItem.remove();
    }

    this.activityList.prepend(li);
    while (this.activityList.childElementCount > 5) {
      this.activityList.lastElementChild?.remove();
    }
  }

  public clearActivity(): void {
    if (!this.activityList) return;
    this.activityList.innerHTML = `
      <li class="students__activity-item students__activity-item--empty">
        Nothing yet — uploads will appear here with timestamps and status.
      </li>
    `;
  }

  public clearPreview(): void {
    if (!this.previewBody) return;
    this.previewBody.innerHTML = "";
    if (this.emptyRow) {
      this.previewBody.appendChild(this.emptyRow);
      this.emptyRow.removeAttribute("hidden");
    }
  }

  public setBusy(isBusy: boolean): void {
    this.wrapper?.setAttribute("aria-busy", isBusy ? "true" : "false");
  }
}
