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

  private getInputElement(id: string): HTMLInputElement | null {
    return document.getElementById(id) as HTMLInputElement | null;
  }

  private computeFormattedDateFromDigits(digits: string): string {
    const cleanDigits = digits.slice(0, 8);

    if (cleanDigits.length <= 2) {
      return cleanDigits;
    }
    if (cleanDigits.length <= 4) {
      return `${cleanDigits.slice(0, 2)}.${cleanDigits.slice(2)}`;
    }

    return `${cleanDigits.slice(0, 2)}.${cleanDigits.slice(
      2,
      4,
    )}.${cleanDigits.slice(4)}`;
  }

  private mapDigitsToFormattedIndex(formatted: string, digitCount: number): number {
    if (digitCount <= 0) {
      return 0;
    }

    let digitsSeen = 0;

    for (let index = 0; index < formatted.length; index++) {
      if (/\d/.test(formatted[index])) {
        digitsSeen += 1;
        if (digitsSeen === digitCount) {
          return index + 1;
        }
      }
    }

    return formatted.length;
  }

  private formatDateInputValue(input: HTMLInputElement): void {
    const initialSelection = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value
      .slice(0, initialSelection)
      .replace(/\D/g, "").length;

    const digitsOnly = input.value.replace(/\D/g, "");
    const formattedValue = this.computeFormattedDateFromDigits(digitsOnly);

    if (input.value !== formattedValue) {
      input.value = formattedValue;
    }

    if (document.activeElement === input) {
      const targetPosition = this.mapDigitsToFormattedIndex(
        formattedValue,
        digitsBeforeCursor,
      );
      const applySelection = () => {
        input.setSelectionRange(targetPosition, targetPosition);
      };

      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(applySelection);
      } else {
        applySelection();
      }
    }
  }

  private formatIsoDateToDisplay(isoDate: string): string {
    const [year, month, day] = isoDate.split("-");
    if (!year || !month || !day) {
      return isoDate;
    }

    return `${day.padStart(2, "0")}.${month.padStart(2, "0")}.${year.padStart(
      4,
      "0",
    )}`;
  }

  private formatScheduleDate(dateIso: string): string {
    const [yearString, monthString, dayString] = dateIso.split("-");
    const year = Number.parseInt(yearString ?? "", 10);
    const month = Number.parseInt(monthString ?? "", 10);
    const day = Number.parseInt(dayString ?? "", 10);

    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return dateIso;
    }

    const previewDate = new Date(Date.UTC(year, month - 1, day));
    try {
      return previewDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateIso;
    }
  }

  private isValidDateComponents(
    year: number,
    month: number,
    day: number,
  ): boolean {
    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day) ||
      year < 1000 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return false;
    }

    const candidate = new Date(year, month - 1, day);

    return (
      candidate.getFullYear() === year &&
      candidate.getMonth() === month - 1 &&
      candidate.getDate() === day
    );
  }

  private parseDateInput(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d{8}$/.test(trimmed)) {
      const isoYear = Number.parseInt(trimmed.slice(0, 4), 10);
      const isoMonth = Number.parseInt(trimmed.slice(4, 6), 10);
      const isoDay = Number.parseInt(trimmed.slice(6, 8), 10);

      if (this.isValidDateComponents(isoYear, isoMonth, isoDay)) {
        return `${isoYear.toString().padStart(4, "0")}-${isoMonth
          .toString()
          .padStart(2, "0")}-${isoDay.toString().padStart(2, "0")}`;
      }

      const compactDay = Number.parseInt(trimmed.slice(0, 2), 10);
      const compactMonth = Number.parseInt(trimmed.slice(2, 4), 10);
      const compactYear = Number.parseInt(trimmed.slice(4), 10);

      if (this.isValidDateComponents(compactYear, compactMonth, compactDay)) {
        return `${compactYear.toString().padStart(4, "0")}-${compactMonth
          .toString()
          .padStart(2, "0")}-${compactDay.toString().padStart(2, "0")}`;
      }
    }

    const isoDelimitedMatch = trimmed.match(
      /^(\d{4})[.\-/\\](\d{1,2})[.\-/\\](\d{1,2})$/,
    );
    if (isoDelimitedMatch) {
      const year = Number.parseInt(isoDelimitedMatch[1], 10);
      const month = Number.parseInt(isoDelimitedMatch[2], 10);
      const day = Number.parseInt(isoDelimitedMatch[3], 10);
      if (this.isValidDateComponents(year, month, day)) {
        return `${year.toString().padStart(4, "0")}-${month
          .toString()
          .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      }
    }

    const delimitedMatch = trimmed.match(
      /^(\d{1,2})[.\-/\\](\d{1,2})[.\-/\\](\d{4})$/,
    );
    if (delimitedMatch) {
      let day = Number.parseInt(delimitedMatch[1], 10);
      let month = Number.parseInt(delimitedMatch[2], 10);
      const year = Number.parseInt(delimitedMatch[3], 10);
      const usesDotSeparator = trimmed.includes(".");

      if (!usesDotSeparator) {
        const alternativeDay = Number.parseInt(delimitedMatch[2], 10);
        const alternativeMonth = Number.parseInt(delimitedMatch[1], 10);

        if (alternativeDay > 12 && alternativeMonth <= 12) {
          day = alternativeDay;
          month = alternativeMonth;
        }
      }

      if (this.isValidDateComponents(year, month, day)) {
        return `${year.toString().padStart(4, "0")}-${month
          .toString()
          .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      }
    }

    const isoCompactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (isoCompactMatch) {
      const year = Number.parseInt(isoCompactMatch[1], 10);
      const month = Number.parseInt(isoCompactMatch[2], 10);
      const day = Number.parseInt(isoCompactMatch[3], 10);

      if (this.isValidDateComponents(year, month, day)) {
        return `${year.toString().padStart(4, "0")}-${month
          .toString()
          .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      }
    }

    const dmyCompactMatch = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (dmyCompactMatch) {
      const day = Number.parseInt(dmyCompactMatch[1], 10);
      const month = Number.parseInt(dmyCompactMatch[2], 10);
      const year = Number.parseInt(dmyCompactMatch[3], 10);

      if (this.isValidDateComponents(year, month, day)) {
        return `${year.toString().padStart(4, "0")}-${month
          .toString()
          .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      }
    }

    return null;
  }

  private parseTimeInput(value: string): string | null {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      return null;
    }

    const compactMatch = trimmed.match(/^(\d{1,2})(\d{2})$/);
    const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/);
    const meridiemMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);

    let hours: number | null = null;
    let minutes: number | null = null;

    if (colonMatch) {
      hours = Number.parseInt(colonMatch[1], 10);
      minutes = Number.parseInt(colonMatch[2], 10);
      const meridiem = colonMatch[3];
      if (meridiem) {
        ({ hours, minutes } = this.applyMeridiem(hours, minutes, meridiem));
      }
    } else if (meridiemMatch) {
      hours = Number.parseInt(meridiemMatch[1], 10);
      minutes = Number.parseInt(meridiemMatch[2] ?? "0", 10);
      ({ hours, minutes } = this.applyMeridiem(
        hours,
        minutes,
        meridiemMatch[3],
      ));
    } else if (compactMatch) {
      hours = Number.parseInt(compactMatch[1], 10);
      minutes = Number.parseInt(compactMatch[2], 10);
    }

    if (
      hours === null ||
      minutes === null ||
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }

  private applyMeridiem(
    hours: number,
    minutes: number,
    meridiem: string,
  ): { hours: number; minutes: number } {
    const normalizedMeridiem = meridiem.toLowerCase();

    if (normalizedMeridiem === "am") {
      hours = hours % 12;
    } else if (normalizedMeridiem === "pm") {
      hours = hours % 12 + 12;
    }

    return { hours, minutes };
  }

  private updateInputFeedback(
    input: HTMLInputElement | null,
    rawValue: string,
    isValid: boolean,
    message?: string,
  ): void {
    if (!input) {
      return;
    }

    const hasValue = rawValue.trim().length > 0;

    if (hasValue && !isValid) {
      input.classList.add("input--error");
      input.setAttribute("aria-invalid", "true");
      input.setCustomValidity(message || "Enter a valid value.");
      if (message) {
        input.title = message;
      }
    } else {
      input.classList.remove("input--error");
      input.removeAttribute("aria-invalid");
      input.setCustomValidity("");
      if (hasValue) {
        input.title = "";
      } else {
        input.removeAttribute("title");
      }
    }
  }

  private compareTimes(timeA: string, timeB: string): number {
    const [hoursA, minutesA] = timeA.split(":").map((part) => Number(part));
    const [hoursB, minutesB] = timeB.split(":").map((part) => Number(part));
    return hoursA * 60 + minutesA - (hoursB * 60 + minutesB);
  }

  private tryGetNormalizedScheduleConfig(): ScheduleConfig | null {
    const startDateInput = this.getInputElement("start-date");
    const endDateInput = this.getInputElement("end-date");
    const startTimeInput = this.getInputElement("start-time");
    const endTimeInput = this.getInputElement("end-time");

    const startDateRaw = startDateInput?.value ?? "";
    const endDateRaw = endDateInput?.value ?? "";
    const startTimeRaw = startTimeInput?.value ?? "";
    const endTimeRaw = endTimeInput?.value ?? "";

    const startDate = this.parseDateInput(startDateRaw);
    const endDate = this.parseDateInput(endDateRaw);
    const startTime = this.parseTimeInput(startTimeRaw);
    const endTime = this.parseTimeInput(endTimeRaw);
    const selectedDays = this.getSelectedDays();

    if (!startDate || !endDate || !startTime || !endTime) {
      return null;
    }

    if (new Date(startDate) > new Date(endDate)) {
      return null;
    }

    if (this.compareTimes(startTime, endTime) >= 0) {
      return null;
    }

    if (selectedDays.length === 0) {
      return null;
    }

    return {
      startDate,
      endDate,
      startTime,
      endTime,
      selectedDays,
    };
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

    ["start-date", "end-date"].forEach((id) => {
      const input = this.getInputElement(id);
      if (!input) {
        return;
      }

      input.addEventListener("input", () => this.formatDateInputValue(input));
      input.addEventListener("blur", () => {
        const normalized = this.parseDateInput(input.value);
        if (normalized) {
          input.value = this.formatIsoDateToDisplay(normalized);
        }
        this.validateScheduleForm();
      });

      this.formatDateInputValue(input);
    });

    ["start-time", "end-time"].forEach((id) => {
      const input = this.getInputElement(id);
      input?.addEventListener("blur", () => {
        const normalized = this.parseTimeInput(input.value);
        if (normalized) {
          input.value = normalized;
        }
        this.validateScheduleForm();
      });
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
    const startDateInput = this.getInputElement("start-date");
    const endDateInput = this.getInputElement("end-date");
    const startTimeInput = this.getInputElement("start-time");
    const endTimeInput = this.getInputElement("end-time");

    const startDateRaw = startDateInput?.value ?? "";
    const endDateRaw = endDateInput?.value ?? "";
    const startTimeRaw = startTimeInput?.value ?? "";
    const endTimeRaw = endTimeInput?.value ?? "";

    const startDate = this.parseDateInput(startDateRaw);
    const endDate = this.parseDateInput(endDateRaw);
    const startTime = this.parseTimeInput(startTimeRaw);
    const endTime = this.parseTimeInput(endTimeRaw);
    const selectedDays = this.getSelectedDays();

    const datesOrderValid =
      startDate && endDate ? new Date(startDate) <= new Date(endDate) : true;
    const timesOrderValid =
      startTime && endTime ? this.compareTimes(startTime, endTime) < 0 : true;
    const hasSelectedDays = selectedDays.length > 0;

    this.updateInputFeedback(startDateInput, startDateRaw, !!startDate);
    this.updateInputFeedback(
      endDateInput,
      endDateRaw,
      !!endDate && datesOrderValid,
      startDate && endDate && !datesOrderValid
        ? "End date must be on or after start date."
        : undefined,
    );
    this.updateInputFeedback(startTimeInput, startTimeRaw, !!startTime);
    this.updateInputFeedback(
      endTimeInput,
      endTimeRaw,
      !!endTime && timesOrderValid,
      startTime && endTime && !timesOrderValid
        ? "End time must be after start time."
        : undefined,
    );

    const isValid =
      !!startDate &&
      !!endDate &&
      !!startTime &&
      !!endTime &&
      datesOrderValid &&
      timesOrderValid &&
      hasSelectedDays;

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

  private async generateSchedule(): Promise<void> {

    const config = this.tryGetNormalizedScheduleConfig();
    if (!config) {
      alert(
        "Please provide valid dates, times, and at least one teaching day before scheduling.",
      );
      this.validateScheduleForm();
      return;
    }

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

    const hasSchedule = this.currentSchedule.length > 0;

    previewContainer.classList.toggle('schedule__content--empty', !hasSchedule);
    this.schedulePreviewSection.classList.toggle('schedule__preview--empty', !hasSchedule);

    // Show schedule rows or placeholder
    if (hasSchedule) {
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
  <div class="schedule__cell schedule__cell--number">
    <span class="schedule__badge">#${session.lessonNumber}</span>
  </div>
  <div class="schedule__cell schedule__cell--day">
    <span class="schedule__field-label">Day</span>
    <span class="schedule__day">${this.formatDay(session.day)}</span>
    <span class="schedule__date">${this.formatScheduleDate(session.date)}</span>
  </div>
  <label class="schedule__cell schedule__cell--time schedule__cell--start">
    <span class="schedule__field-label">Start</span>
    <input type="text" class="input input--time schedule__input schedule__input--start" value="${session.startTime}" placeholder="HH:MM" autocomplete="off" inputmode="numeric" data-index="${index}">
  </label>
  <label class="schedule__cell schedule__cell--time schedule__cell--end">
    <span class="schedule__field-label">End</span>
    <input type="text" class="input input--time schedule__input schedule__input--end" value="${session.endTime}" placeholder="HH:MM" autocomplete="off" inputmode="numeric" data-index="${index}">
  </label>
  <div class="schedule__cell schedule__cell--actions">
    <button class="button button--extra-small button--cross schedule__delete" type="button" aria-label="Remove lesson ${session.lessonNumber}" data-index="${index}"></button>
  </div>
 `;

    // Bind events for time editing
    const startTimeInput = row.querySelector(
      ".schedule__input--start",
    ) as HTMLInputElement;
    const endTimeInput = row.querySelector(
      ".schedule__input--end",
    ) as HTMLInputElement;
    const deleteButton = row.querySelector(
      ".schedule__delete",
    ) as HTMLButtonElement;

    startTimeInput.addEventListener("blur", (e) =>
      this.updateLessonTime(
        index,
        "startTime",
        (e.target as HTMLInputElement).value,
      ),
    );
    endTimeInput.addEventListener("blur", (e) =>
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
    const normalizedTime = this.parseTimeInput(newTime);
    const inputSelector =
      timeType === "startTime"
        ? ".schedule__input--start"
        : ".schedule__input--end";
    const input = this.schedulePreviewSection.querySelector(
      `${inputSelector}[data-index="${index}"]`,
    ) as HTMLInputElement | null;

    if (!normalizedTime) {
      alert("Please enter a valid time (e.g., 09:30 or 2:15 PM).");
      if (input) {
        input.value = this.currentSchedule[index][timeType];
      }
      return;
    }

    const otherTime =
      timeType === "startTime"
        ? this.currentSchedule[index].endTime
        : this.currentSchedule[index].startTime;

    const isOrderValid =
      timeType === "startTime"
        ? this.compareTimes(normalizedTime, otherTime) < 0
        : this.compareTimes(otherTime, normalizedTime) < 0;

    if (!isOrderValid) {
      alert("End time must be after the start time for each lesson.");
      if (input) {
        input.value = this.currentSchedule[index][timeType];
      }
      return;
    }

    this.currentSchedule[index][timeType] = normalizedTime;
    if (input) {
      input.value = normalizedTime;
    }

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
