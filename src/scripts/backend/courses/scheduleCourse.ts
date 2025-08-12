import { supabase } from "../../backend/supabase.js";

interface ScheduleSession {
  lessonNumber: number;
  day: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface ScheduleConfig {
  startDate: string;
  endDate: string;
  selectedDays: string[];
  startTime: string;
  endTime: string;
}

export class ScheduleCourseManager {
  private courseId: string;
  private scheduleConfigSection!: HTMLElement;
  private schedulePreviewSection!: HTMLElement;
  private scheduleButton!: HTMLButtonElement;
  private deleteScheduleButton!: HTMLButtonElement;
  private currentSchedule: ScheduleSession[] = [];

  constructor(courseId?: string) {
    // Get course ID from parameter, URL, or session storage
    this.courseId = courseId || this.getCourseId();

    console.log('📅 ScheduleCourseManager initializing with course ID:', this.courseId);

    if (!this.courseId) {
      console.warn("⚠️ No course ID available for schedule management - some features may be limited");
      // Still initialize elements and basic functionality
      this.initializeElements();
      this.bindEvents();
      return;
    }

    this.initializeElements();
    this.bindEvents();
    this.loadExistingSchedule();

    // Run initial validation to set proper button state
    this.validateScheduleForm();
  }

  private getCourseId(): string {
    // First try to get course ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const courseIdFromUrl = urlParams.get('courseId') || urlParams.get('id');
    
    if (courseIdFromUrl) {
      console.log('📅 Course ID from URL:', courseIdFromUrl);
      return courseIdFromUrl;
    }

    // Fallback to session storage (for backward compatibility)
    const courseIdFromSession = sessionStorage.getItem("currentCourseId");
    if (courseIdFromSession) {
      console.log('📅 Course ID from session storage:', courseIdFromSession);
      return courseIdFromSession;
    }

    console.log('📅 No course ID found for schedule manager');
    return "";
  }

  private initializeElements(): void {
    this.scheduleConfigSection = document.getElementById(
      "schedule-config",
    ) as HTMLElement;
    this.schedulePreviewSection = document.getElementById(
      "schedule-preview",
    ) as HTMLElement;
    this.scheduleButton = document.getElementById(
      "schedule-course-btn",
    ) as HTMLButtonElement;
    this.deleteScheduleButton = document.getElementById(
      "delete-schedule-btn",
    ) as HTMLButtonElement;

    // Check if all elements were found
    if (!this.scheduleConfigSection) {
      console.error("schedule-config element not found");
      return;
    }
    if (!this.schedulePreviewSection) {
      console.error("schedule-preview element not found");
      return;
    }
    if (!this.scheduleButton) {
      console.error("schedule-course-btn element not found");
      return;
    }
    if (!this.deleteScheduleButton) {
      console.error("delete-schedule-btn element not found");
      return;
    }

  }

  private bindEvents(): void {
    if (
      !this.scheduleConfigSection ||
      !this.scheduleButton ||
      !this.deleteScheduleButton
    ) {
      console.error("Cannot bind events: required elements not found");
      return;
    }

    // Form input validation
    this.scheduleConfigSection.addEventListener("input", () =>
      this.validateScheduleForm(),
    );
    this.scheduleConfigSection.addEventListener("change", () =>
      this.validateScheduleForm(),
    );

    // Day selection buttons
    const dayButtons =
      this.scheduleConfigSection.querySelectorAll(".day-button");
    dayButtons.forEach((button) => {
      button.addEventListener("click", (e) =>
        this.toggleDaySelection(e.target as HTMLButtonElement),
      );
    });

    // Schedule generation
    this.scheduleButton.addEventListener("click", (e) => {
      console.log("Button clicked!", {
        disabled: this.scheduleButton.disabled,
        classes: this.scheduleButton.className,
        event: e,
      });
      this.generateSchedule();
    });

    // Delete schedule
    this.deleteScheduleButton.addEventListener("click", (e) => {
      console.log("Delete button clicked!", {
        disabled: this.deleteScheduleButton.disabled,
        classes: this.deleteScheduleButton.className,
        event: e,
      });
      this.deleteSchedule();
    });

  }

  private validateScheduleForm(): void {
    const startDate = (
      document.getElementById("start-date") as HTMLInputElement
    )?.value;
    const endDate = (document.getElementById("end-date") as HTMLInputElement)
      ?.value;
    const startTime = (
      document.getElementById("start-time") as HTMLInputElement
    )?.value;
    const endTime = (document.getElementById("end-time") as HTMLInputElement)
      ?.value;
    const selectedDays = this.getSelectedDays();

    const isValid =
      startDate && endDate && startTime && endTime && selectedDays.length > 0;

    console.log("Form validation:", {
      startDate,
      endDate,
      startTime,
      endTime,
      selectedDays,
      isValid,
    });

    if (isValid) {
      this.scheduleButton.classList.add("active");
      this.scheduleButton.classList.remove("button--disabled");
      this.scheduleButton.disabled = false;
    } else {
      this.scheduleButton.classList.remove("active");
      this.scheduleButton.classList.add("button--disabled");
      this.scheduleButton.disabled = true;
    }
  }

  private toggleDaySelection(button: HTMLButtonElement): void {
    button.classList.toggle("selected");
    this.validateScheduleForm();
  }

  private getSelectedDays(): string[] {
    const selectedButtons = this.scheduleConfigSection.querySelectorAll(
      ".day-button.selected",
    );
    return Array.from(selectedButtons).map(
      (btn) => (btn as HTMLElement).dataset.day || "",
    );
  }

  private getScheduleConfig(): ScheduleConfig {
    return {
      startDate: (document.getElementById("start-date") as HTMLInputElement)
        .value,
      endDate: (document.getElementById("end-date") as HTMLInputElement).value,
      selectedDays: this.getSelectedDays(),
      startTime: (document.getElementById("start-time") as HTMLInputElement)
        .value,
      endTime: (document.getElementById("end-time") as HTMLInputElement).value,
    };
  }

  private async generateSchedule(): Promise<void> {

    const config = this.getScheduleConfig();

    const sessions = this.calculateScheduleSessions(config);

    try {
      await this.saveScheduleToDatabase(sessions);
      this.currentSchedule = sessions;
      this.renderSchedulePreview();
      this.lockScheduleConfig();
      this.showDeleteScheduleButton();
    } catch (error) {
      console.error("Error generating schedule:", error);
      alert("Failed to generate schedule. Please try again.");
    }
  }

  private calculateScheduleSessions(config: ScheduleConfig): ScheduleSession[] {
    const sessions: ScheduleSession[] = [];
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);

    let lessonNumber = 1;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayName = currentDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

      if (config.selectedDays.includes(dayName)) {
        sessions.push({
          lessonNumber: lessonNumber++,
          day: dayName,
          date: currentDate.toISOString().split("T")[0],
          startTime: config.startTime,
          endTime: config.endTime,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return sessions;
  }

  private async saveScheduleToDatabase(
    sessions: ScheduleSession[],
  ): Promise<void> {
    if (!this.courseId) {
      console.warn('📅 Cannot save schedule: no course ID available');
      throw new Error('No course ID available for saving schedule');
    }

    const { error } = await supabase
      .from("courses")
      .update({
        schedule_settings: sessions,
        course_days: sessions.length,
      })
      .eq("id", this.courseId);

    if (error) {
      throw error;
    }
  }

  private renderSchedulePreview(): void {
    const previewContainer =
      this.schedulePreviewSection.querySelector(".schedule-list");
    if (!previewContainer) return;

    previewContainer.innerHTML = "";

    // Safety check: ensure currentSchedule is an array
    if (!Array.isArray(this.currentSchedule)) {
      console.warn("currentSchedule is not an array:", this.currentSchedule);
      this.currentSchedule = [];
      return;
    }

    this.currentSchedule.forEach((session, index) => {
      const row = this.createScheduleRow(session, index);
      previewContainer.appendChild(row);
    });

    this.updateTotalLessonsDisplay();
    this.schedulePreviewSection.classList.remove("hidden");
  }

  private createScheduleRow(
    session: ScheduleSession,
    index: number,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "schedule-row";
    row.innerHTML = `
            <span class="lesson-number">${session.lessonNumber}</span>
            <span class="lesson-day">${this.formatDay(session.day)}</span>
            <input type="time" class="lesson-start-time" value="${session.startTime}" data-index="${index}">
            <input type="time" class="lesson-end-time" value="${session.endTime}" data-index="${index}">
            <button class="delete-lesson-btn" data-index="${index}">×</button>
        `;

    // Bind events for time editing
    const startTimeInput = row.querySelector(
      ".lesson-start-time",
    ) as HTMLInputElement;
    const endTimeInput = row.querySelector(
      ".lesson-end-time",
    ) as HTMLInputElement;
    const deleteButton = row.querySelector(
      ".delete-lesson-btn",
    ) as HTMLButtonElement;

    startTimeInput.addEventListener("change", (e) =>
      this.updateLessonTime(
        index,
        "startTime",
        (e.target as HTMLInputElement).value,
      ),
    );
    endTimeInput.addEventListener("change", (e) =>
      this.updateLessonTime(
        index,
        "endTime",
        (e.target as HTMLInputElement).value,
      ),
    );
    deleteButton.addEventListener("click", () => this.deleteLessonRow(index));

    return row;
  }

  private async updateLessonTime(
    index: number,
    timeType: "startTime" | "endTime",
    newTime: string,
  ): Promise<void> {
    this.currentSchedule[index][timeType] = newTime;

    try {
      await this.saveScheduleToDatabase(this.currentSchedule);
    } catch (error) {
      console.error("Error updating lesson time:", error);
    }
  }

  private async deleteLessonRow(index: number): Promise<void> {
    if (!confirm("Are you sure you want to delete this lesson?")) {
      return;
    }

    this.currentSchedule.splice(index, 1);

    // Renumber lessons
    this.currentSchedule.forEach((session, i) => {
      session.lessonNumber = i + 1;
    });

    try {
      await this.saveScheduleToDatabase(this.currentSchedule);
      this.renderSchedulePreview();
    } catch (error) {
      console.error("Error deleting lesson:", error);
    }
  }

  private async deleteSchedule(): Promise<void> {
    if (!confirm("Are you sure you want to delete the entire schedule?")) {
      return;
    }

    try {
      await supabase
        .from("courses")
        .update({
          schedule_settings: null,
          course_days: null,
        })
        .eq("id", this.courseId);

      this.currentSchedule = [];
      this.unlockScheduleConfig();
      this.hideSchedulePreview();
      this.hideDeleteScheduleButton();
    } catch (error) {
      console.error("Error deleting schedule:", error);
    }
  }

  private async loadExistingSchedule(): Promise<void> {
    if (!this.courseId) {
      console.warn('📅 Cannot load schedule: no course ID available');
      this.currentSchedule = [];
      this.hideSchedulePreview();
      this.unlockScheduleConfig();
      this.hideDeleteScheduleButton();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("schedule_settings, course_days")
        .eq("id", this.courseId)
        .single();

      if (error) throw error;

      if (data?.schedule_settings && Array.isArray(data.schedule_settings)) {
        this.currentSchedule = data.schedule_settings;
        this.renderSchedulePreview();
        this.lockScheduleConfig();
        this.showDeleteScheduleButton();
      } else {
        // No existing schedule or invalid data - ensure currentSchedule is empty array
        this.currentSchedule = [];
        this.hideSchedulePreview();
        this.unlockScheduleConfig();
        this.hideDeleteScheduleButton();
      }
    } catch (error) {
      console.error("Error loading existing schedule:", error);
      // Ensure currentSchedule is always an array even on error
      this.currentSchedule = [];
      this.hideSchedulePreview();
      this.unlockScheduleConfig();
      this.hideDeleteScheduleButton();
    }
  }

  private lockScheduleConfig(): void {
    const inputs = this.scheduleConfigSection.querySelectorAll(
      "input, button:not(#delete-schedule-btn)",
    );
    inputs.forEach((input) => {
      (input as HTMLInputElement | HTMLButtonElement).disabled = true;
    });
    this.scheduleConfigSection.classList.add("locked");
  }

  private unlockScheduleConfig(): void {
    const inputs = this.scheduleConfigSection.querySelectorAll("input, button");
    inputs.forEach((input) => {
      (input as HTMLInputElement | HTMLButtonElement).disabled = false;
    });
    this.scheduleConfigSection.classList.remove("locked");
    this.validateScheduleForm();
  }

  private showDeleteScheduleButton(): void {
    this.deleteScheduleButton.classList.remove("hidden");
    this.deleteScheduleButton.disabled = false;
    this.deleteScheduleButton.style.pointerEvents = "auto";
  }

  private hideDeleteScheduleButton(): void {
    this.deleteScheduleButton.classList.add("hidden");
  }

  private hideSchedulePreview(): void {
    this.schedulePreviewSection.classList.add("hidden");
  }

  private updateTotalLessonsDisplay(): void {
    const totalDisplay =
      this.schedulePreviewSection.querySelector(".total-lessons");
    if (totalDisplay) {
      totalDisplay.textContent = `Total lessons: ${this.currentSchedule.length}`;
    }
  }

  /**
   * Set course ID after initialization
   */
  public setCourseId(courseId: string): void {
    if (this.courseId === courseId) {
      return; // No change needed
    }
    
    this.courseId = courseId;
    console.log('📅 Course ID updated for schedule manager:', courseId);
    
    // Reload data with new course ID
    this.loadExistingSchedule();
    this.validateScheduleForm();
  }

  /**
   * Refresh the display to show current state
   */
  public refreshDisplay(): void {
    if (this.currentSchedule && this.currentSchedule.length > 0) {
      this.renderSchedulePreview();
      this.lockScheduleConfig();
      this.showDeleteScheduleButton();
    } else {
      this.hideSchedulePreview();
      this.unlockScheduleConfig();
      this.hideDeleteScheduleButton();
    }
  }

  private formatDay(day: string): string {
    return day.charAt(0).toUpperCase() + day.slice(1);
  }
}

// Make ScheduleCourseManager available globally for testing/debugging
declare global {
  interface Window {
    ScheduleCourseManager: typeof ScheduleCourseManager;
  }
}

if (typeof window !== "undefined") {
  window.ScheduleCourseManager = ScheduleCourseManager;
}
