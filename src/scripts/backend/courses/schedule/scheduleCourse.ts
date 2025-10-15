import { supabase } from "../../supabase.js";

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


    // Always store instance globally for debugging, even without course ID
    if (typeof window !== "undefined") {
      (window as any).scheduleManagerInstance = this;
    }

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
      return courseIdFromUrl;
    }

    // Fallback to session storage (for backward compatibility)
    const courseIdFromSession = sessionStorage.getItem("currentCourseId");
    if (courseIdFromSession) {
      return courseIdFromSession;
    }

    console.warn('📅 No course ID found for schedule manager');
    console.warn('📅 Current URL:', window.location.href);
    console.warn('📅 Available URL params:', Object.fromEntries(urlParams.entries()));
    console.warn('📅 Session storage keys:', Object.keys(sessionStorage));
    return "";
  }

  private initializeElements(): void {
    this.scheduleConfigSection = document.getElementById(
      "schedule-config",
    ) as HTMLElement;
    this.schedulePreviewSection = document.querySelector(
      ".schedule__preview",
    ) as HTMLElement;
    this.scheduleButton = document.getElementById(
      "schedule-course-btn",
    ) as HTMLButtonElement;
    this.deleteScheduleButton = document.getElementById(
      "delete-schedule-btn",
    ) as HTMLButtonElement; // Check if all elements were found
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
      this.scheduleConfigSection.querySelectorAll('.schedule__days__button');
    dayButtons.forEach((button) => {
      button.addEventListener("click", (e) =>
        this.toggleDaySelection(e.target as HTMLButtonElement),
      );
    });

    // Schedule generation
    this.scheduleButton.addEventListener("click", (e) => {
      console.log("Button clicked!", {
        disabled: this.scheduleButton.disabled,
        event: e,
      });
      this.generateSchedule();
    });

    // Delete schedule
    this.deleteScheduleButton.addEventListener("click", (e) => {
      console.log("Delete button clicked!", {
        disabled: this.deleteScheduleButton.disabled,
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
      this.scheduleButton.classList.remove('button--disabled');
      this.scheduleButton.disabled = false;
    } else {
      this.scheduleButton.classList.add('button--disabled');
      this.scheduleButton.disabled = true;
    }
  }

  private toggleDaySelection(button: HTMLButtonElement): void {
    button.classList.toggle('button--primary');
    button.classList.toggle('button--outline');
    this.validateScheduleForm();
  }

  private getStatusElements(): {
    container: HTMLElement | null;
    text: HTMLElement | null;
  } {
    const container = document.getElementById(
      "schedule-save-status",
    ) as HTMLElement | null;
    const text = container?.querySelector(
      ".save-status__text",
    ) as HTMLElement | null;
    return { container, text };
  }

  private formatSavedMessage(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    return `This page was last saved at ${hours}:${minutes}, on ${day}.${month}.${year}`;
  }

  private setStatus(
    state: "empty" | "saving" | "saved" | "error",
    message?: string,
  ): void {
    const { container, text } = this.getStatusElements();
    if (!container || !text) return;

    container.dataset.status = state;

    if (!message) {
      if (state === "saved") {
        text.textContent = this.formatSavedMessage();
        return;
      }
      if (state === "saving") {
        text.textContent = "Saving changes…";
        return;
      }
      if (state === "empty") {
        text.textContent = "No data submitted yet";
        return;
      }
    }

    text.textContent = message || "";
  }

  private getSelectedDays(): string[] {
    const selectedButtons = this.scheduleConfigSection.querySelectorAll(
      ".schedule__days__button.button--primary",
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

    this.setStatus("saving", "Generating schedule…");

    try {
      await this.saveScheduleToDatabase(sessions);
      this.currentSchedule = sessions;
      this.renderSchedulePreview();
      this.lockScheduleConfig();
      this.showDeleteScheduleButton();
      this.setStatus("saved");
    } catch (error) {
      console.error("Error generating schedule:", error);
      alert("Failed to generate schedule. Please try again.");
      this.setStatus("error", "Failed to generate schedule");
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
        course_sessions: sessions.length,
      })
      .eq("id", this.courseId);

    if (error) {
      throw error;
    }
  }

  private renderSchedulePreview(): void {

    const previewContainer = this.schedulePreviewSection.querySelector('.schedule__content');
    if (!previewContainer) {
      console.error('📅 .schedule__content container not found');
      return;
    }

    // Clear existing content
    previewContainer.innerHTML = "";

    // Safety check: ensure currentSchedule is an array
    if (!Array.isArray(this.currentSchedule)) {
      console.warn("📅 currentSchedule is not an array:", this.currentSchedule);
      this.currentSchedule = [];
      return;
    }

    // Show schedule rows or placeholder
    if (this.currentSchedule.length > 0) {
      this.currentSchedule.forEach((session, index) => {
        const row = this.createScheduleRow(session, index);
        previewContainer.appendChild(row);
      });

      // Hide any existing placeholder and show the preview
      this.schedulePreviewSection.style.display = 'block';
    } else {
      // Show placeholder if no schedule
      const placeholder = document.createElement('div');
      placeholder.className = 'schedule__placeholder';
      placeholder.innerHTML = '<p>Click "Schedule Course" to generate your lesson schedule</p>';
      previewContainer.appendChild(placeholder);

      // Still show the preview section but with placeholder
      this.schedulePreviewSection.style.display = 'block';
    }

    this.updateTotalLessonsDisplay();
  }

  private createScheduleRow(
    session: ScheduleSession,
    index: number,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = 'schedule__row';
    row.innerHTML = `
 <span class="lesson-number">${session.lessonNumber}</span>
 <span class="lesson-day">${this.formatDay(session.day)}</span>
 <input type="time" class="lesson-start-time" value="${session.startTime}" data-index="${index}">
 <input type="time" class="lesson-end-time" value="${session.endTime}" data-index="${index}">
 <button class="button button--extra-small button--cross" data-index="${index}"></button>
 `;

    // Bind events for time editing
    const startTimeInput = row.querySelector(
      ".lesson-start-time",
    ) as HTMLInputElement;
    const endTimeInput = row.querySelector(
      ".lesson-end-time",
    ) as HTMLInputElement;
    const deleteButton = row.querySelector(
      ".button--cross",
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

    this.setStatus("saving", "Updating schedule…");

    try {
      await this.saveScheduleToDatabase(this.currentSchedule);
      this.setStatus("saved");
    } catch (error) {
      console.error("Error updating lesson time:", error);
      this.setStatus("error", "Failed to update schedule");
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

    this.setStatus("saving", "Updating schedule…");

    try {
      await this.saveScheduleToDatabase(this.currentSchedule);
      this.renderSchedulePreview();
      this.setStatus("saved");
    } catch (error) {
      console.error("Error deleting lesson:", error);
      this.setStatus("error", "Failed to update schedule");
    }
  }

  private async deleteSchedule(): Promise<void> {
    if (!confirm("Are you sure you want to delete the entire schedule?")) {
      return;
    }

    this.setStatus("saving", "Deleting schedule…");

    try {
      await supabase
        .from("courses")
        .update({
          schedule_settings: null,
          course_sessions: null,
        })
        .eq("id", this.courseId);

      this.currentSchedule = [];
      this.unlockScheduleConfig();
      this.hideSchedulePreview();
      this.hideDeleteScheduleButton();
      this.setStatus("empty");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      this.setStatus("error", "Failed to delete schedule");
    }
  }

  private async loadExistingSchedule(): Promise<void> {
    if (!this.courseId) {
      console.warn('📅 Cannot load schedule: no course ID available');
      console.warn('📅 Current URL:', window.location.href);
      console.warn('📅 URL params:', new URLSearchParams(window.location.search).toString());
      console.warn('📅 Session storage courseId:', sessionStorage.getItem("currentCourseId"));
      this.currentSchedule = [];
      this.hideSchedulePreview();
      this.unlockScheduleConfig();
      this.hideDeleteScheduleButton();
      this.setStatus("empty");
      return;
    }

    this.setStatus("saving", "Loading schedule…");

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("schedule_settings, course_sessions")
        .eq("id", this.courseId)
        .single();

      if (error) {
        console.error("📅 Supabase error loading schedule:", error);
        this.setStatus("error", "Failed to load schedule");
        throw error;
      }

      if (data?.schedule_settings && Array.isArray(data.schedule_settings)) {
        this.currentSchedule = data.schedule_settings;
        this.renderSchedulePreview();
        this.lockScheduleConfig();
        this.showDeleteScheduleButton();
        if (this.currentSchedule.length > 0) {
          this.setStatus("saved");
        } else {
          this.setStatus("empty");
        }
      } else {
        // No existing schedule or invalid data - ensure currentSchedule is empty array
        this.currentSchedule = [];
        this.hideSchedulePreview();
        this.unlockScheduleConfig();
        this.hideDeleteScheduleButton();
        this.setStatus("empty");
      }
    } catch (error) {
      console.error("📅 Error loading existing schedule:", error);
      // Ensure currentSchedule is always an array even on error
      this.currentSchedule = [];
      this.hideSchedulePreview();
      this.unlockScheduleConfig();
      this.hideDeleteScheduleButton();
      this.setStatus("error", "Failed to load schedule");
    }
  }

  private lockScheduleConfig(): void {
    const inputs = this.scheduleConfigSection.querySelectorAll(
      "input, button:not(#delete-schedule-btn)",
    );
    inputs.forEach((input) => {
      (input as HTMLInputElement | HTMLButtonElement).disabled = true;
    });
    this.scheduleConfigSection.classList.add('form--locked');
  }

  private unlockScheduleConfig(): void {
    const inputs = this.scheduleConfigSection.querySelectorAll("input, button");
    inputs.forEach((input) => {
      (input as HTMLInputElement | HTMLButtonElement).disabled = false;
    });
    this.scheduleConfigSection.classList.remove('form--locked');
    this.validateScheduleForm();
  }

  private showDeleteScheduleButton(): void {
    this.deleteScheduleButton.style.display = 'inline-block';
    this.deleteScheduleButton.disabled = false;
    this.deleteScheduleButton.style.pointerEvents = "auto";
  }

  private hideDeleteScheduleButton(): void {
    this.deleteScheduleButton.style.display = 'none';
  }

  private hideSchedulePreview(): void {
    this.schedulePreviewSection.style.display = 'none';
  }

  private updateTotalLessonsDisplay(): void {
    const totalDisplay =
      this.schedulePreviewSection.querySelector('.schedule__total');
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

    // Immediately reload data with new course ID
    this.loadExistingSchedule();
    this.validateScheduleForm();
  }
  private formatDay(day: string): string {
    return day.charAt(0).toUpperCase() + day.slice(1);
  }
}
