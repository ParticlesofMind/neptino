import type { RosterSummary, StudentRecord } from "./studentsTypes.js";

function formatLearningStyle(styles?: string[] | null): string {
  if (!styles?.length) return "—";
  return styles.join(", ");
}

function formatAssessment(score?: number | null): string {
  if (score === null || score === undefined) return "—";
  return Number.isFinite(score) ? score.toString() : "—";
}

export class StudentsPreview {
  private readonly previewTable: HTMLTableSectionElement | null;
  private readonly emptyRow: HTMLTableRowElement | null;
  private readonly wrapper: HTMLElement | null;
  private readonly feedback: HTMLElement | null;
  private readonly totalEl: HTMLElement | null;
  private readonly gradesEl: HTMLElement | null;
  private readonly syncedEl: HTMLElement | null;
  private readonly statusEl: HTMLElement | null;
  private readonly activityList: HTMLElement | null;
  private onDeleteRow: ((index: number) => Promise<void>) | null = null;
  private onUpdateRow: ((index: number, updates: Partial<StudentRecord>) => Promise<void>) | null = null;

  constructor() {
    this.previewTable = document.getElementById("students-preview-body") as HTMLTableSectionElement | null;
    this.emptyRow = document.getElementById("students-preview-empty") as HTMLTableRowElement | null;
    this.wrapper = document.querySelector(".students__table-wrapper");
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
    if (!this.previewTable) return;

    this.setBusy(true);
    this.previewTable.innerHTML = "";

    if (!students.length) {
      if (this.emptyRow) {
        this.emptyRow.removeAttribute("hidden");
        this.previewTable.appendChild(this.emptyRow);
      }
      this.setBusy(false);
      return;
    }

    students.forEach((student, index) => {
      const row = document.createElement("tr");
      row.className = "students__preview-row";
      row.dataset.studentIndex = String(index);

      const cells = [
        this.createEditableCell(student.first_name ?? "", "first_name", index),
        this.createEditableCell(student.last_name ?? "", "last_name", index),
        this.createEditableCell(student.email ?? "", "email", index),
        this.createEditableCell(student.student_id ?? "", "student_id", index),
        this.createEditableCell(student.grade_level ?? "", "grade_level", index),
        this.createReadOnlyCell(formatLearningStyle(student.learning_style)),
        this.createReadOnlyCell(formatAssessment(student.assessment_score)),
      ];

      cells.forEach((cell) => row.appendChild(cell));

      // Add delete button cell
      const deleteCell = document.createElement("td");
      deleteCell.className = "students__preview-delete";
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "students__preview-delete-btn";
      deleteBtn.textContent = "×";
      deleteBtn.title = "Delete this student";
      deleteBtn.addEventListener("click", () => this.handleDelete(index));
      deleteCell.appendChild(deleteBtn);
      row.appendChild(deleteCell);

      this.previewTable?.appendChild(row);
    });

    if (this.emptyRow) {
      this.emptyRow.setAttribute("hidden", "true");
    }

    this.setBusy(false);
  }

  private createEditableCell(value: string, field: keyof StudentRecord, index: number): HTMLTableCellElement {
    const td = document.createElement("td");
    td.className = "students__preview-cell students__preview-cell--editable";
    
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

    td.appendChild(input);
    return td;
  }

  private createReadOnlyCell(value: string): HTMLTableCellElement {
    const td = document.createElement("td");
    td.className = "students__preview-cell students__preview-cell--readonly";
    td.textContent = value;
    return td;
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
    this.feedback.dataset.state = tone;
  }

  public clearFeedback(): void {
    if (!this.feedback) return;
    this.feedback.hidden = true;
    this.feedback.textContent = "";
    delete this.feedback.dataset.state;
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
    if (!this.previewTable) return;
    this.previewTable.innerHTML = "";
    if (this.emptyRow) {
      this.previewTable.appendChild(this.emptyRow);
      this.emptyRow.removeAttribute("hidden");
    }
  }

  public setBusy(isBusy: boolean): void {
    this.wrapper?.setAttribute("aria-busy", isBusy ? "true" : "false");
  }
}
