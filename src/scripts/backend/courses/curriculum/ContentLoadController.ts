import { ContentLoadService, type ContentLoadConfig, type DurationPresetKey } from "./ContentLoadService";
import type { CurriculumLesson } from "./curriculumManager";

interface ContentLoadControllerOptions {
  supabase: typeof import("../../supabase").supabase;
  lessonDates: Map<number, string>;
  getCourseId(): string | null;
  getCurrentCurriculum(): CurriculumLesson[];
  getContentLoadConfig(): ContentLoadConfig | null;
  setContentLoadConfig(config: ContentLoadConfig): void;
  getScheduledLessonDuration(): number;
  setScheduledLessonDuration(duration: number): void;
  computeCompetencies(topics: number): number;
  regenerateAndSaveCurriculum(): void | Promise<void>;
  renderCurriculumPreview(): void;
}

export class ContentLoadController {
  private readonly supabase: ContentLoadControllerOptions["supabase"];
  private readonly lessonDates: Map<number, string>;
  private readonly getCourseId: ContentLoadControllerOptions["getCourseId"];
  private readonly getCurrentCurriculum: ContentLoadControllerOptions["getCurrentCurriculum"];
  private readonly getContentLoadConfig: ContentLoadControllerOptions["getContentLoadConfig"];
  private readonly setContentLoadConfig: ContentLoadControllerOptions["setContentLoadConfig"];
  private readonly getScheduledLessonDuration: ContentLoadControllerOptions["getScheduledLessonDuration"];
  private readonly setScheduledLessonDuration: ContentLoadControllerOptions["setScheduledLessonDuration"];
  private readonly computeCompetencies: ContentLoadControllerOptions["computeCompetencies"];
  private readonly regenerateAndSaveCurriculum: ContentLoadControllerOptions["regenerateAndSaveCurriculum"];
  private readonly renderCurriculumPreview: ContentLoadControllerOptions["renderCurriculumPreview"];
  private saveTimeout: number | null = null;

  constructor(options: ContentLoadControllerOptions) {
    this.supabase = options.supabase;
    this.lessonDates = options.lessonDates;
    this.getCourseId = options.getCourseId;
    this.getCurrentCurriculum = options.getCurrentCurriculum;
    this.getContentLoadConfig = options.getContentLoadConfig;
    this.setContentLoadConfig = options.setContentLoadConfig;
    this.getScheduledLessonDuration = options.getScheduledLessonDuration;
    this.setScheduledLessonDuration = options.setScheduledLessonDuration;
    this.computeCompetencies = options.computeCompetencies;
    this.regenerateAndSaveCurriculum = options.regenerateAndSaveCurriculum;
    this.renderCurriculumPreview = options.renderCurriculumPreview;
  }

  public async loadScheduleData(): Promise<void> {
    const courseId = this.getCourseId();
    if (!courseId) {
      this.displayNoScheduleWarning();
      return;
    }

    try {
      const { data, error } = await this.supabase
        .from("courses")
        .select("schedule_settings")
        .eq("id", courseId)
        .single();

      if (error) {
        throw error;
      }

      if (
        data?.schedule_settings &&
        Array.isArray(data.schedule_settings) &&
        data.schedule_settings.length > 0
      ) {
        this.lessonDates.clear();
        data.schedule_settings.forEach((session: any, index: number) => {
          if (session.date) {
            this.lessonDates.set(index + 1, session.date);
          }
        });

        const firstLesson = data.schedule_settings[0];
        const duration = ContentLoadService.calculateLessonDuration(
          firstLesson.startTime,
          firstLesson.endTime,
          firstLesson.breakTimes,
        );
        this.setScheduledLessonDuration(duration);
        const config = ContentLoadService.determineContentLoad(
          duration,
          (topics) => this.computeCompetencies(topics),
        );
        this.setContentLoadConfig(config);
        this.displayContentLoad();
      } else {
        this.displayNoScheduleWarning();
      }
    } catch (error) {
      console.error("Error loading schedule data:", error);
      this.displayNoScheduleWarning();
    }
  }

  public displayContentLoad(): void {
    if (!this.getContentLoadConfig()) {
      return;
    }
    this.setupDurationConfiguration();
  }

  public displayNoScheduleWarning(): void {
    this.setupDurationConfiguration();
  }

  public populateInputsFromExistingCurriculum(): void {
    const derivedCounts = this.deriveStructureFromCurriculum();

    if (derivedCounts) {
      this.ensureContentLoadConfigFromCounts(derivedCounts);
      this.syncStructureInputsWithConfig();

      const config = this.getContentLoadConfig();
      if (config && ContentLoadService.isDurationPresetKey(config.type)) {
        this.setDurationButtonVisualState(config.type);
      }

      const topicsInput = document.getElementById("curriculum-topics") as HTMLInputElement | null;
      const objectivesInput = document.getElementById("curriculum-objectives") as HTMLInputElement | null;
      const tasksInput = document.getElementById("curriculum-tasks") as HTMLInputElement | null;

      if (topicsInput && objectivesInput && tasksInput) {
        topicsInput.value = derivedCounts.topics.toString();
        objectivesInput.value = derivedCounts.objectives.toString();
        tasksInput.value = derivedCounts.tasksPerObjective.toString();
      }
    } else {
      this.autoSelectRecommendedDuration();
      this.syncStructureInputsWithConfig();
    }
  }

  public handleDurationSelection(durationType: DurationPresetKey): void {
    const preset = ContentLoadService.getPreset(durationType);
    const topicsInput = document.getElementById('curriculum-topics') as HTMLInputElement;
    const objectivesInput = document.getElementById('curriculum-objectives') as HTMLInputElement;
    const tasksInput = document.getElementById('curriculum-tasks') as HTMLInputElement;

    if (!topicsInput || !objectivesInput || !tasksInput) {
      return;
    }

    topicsInput.value = preset.defaultTopics.toString();
    objectivesInput.value = preset.defaultObjectives.toString();
    tasksInput.value = preset.defaultTasks.toString();

    const duration = this.getScheduledLessonDuration() || preset.maxDuration;
    const config = ContentLoadService.determineContentLoad(
      duration,
      (topics) => this.computeCompetencies(topics),
    );
    this.setContentLoadConfig(config);

    void this.regenerateAndSaveCurriculum();
  }

  private setupDurationConfiguration(): void {
    const contentVolumeRadios = document.querySelectorAll<HTMLInputElement>('input[name="content-volume"]');
    const topicsInput = document.getElementById('curriculum-topics') as HTMLInputElement;
    const objectivesInput = document.getElementById('curriculum-objectives') as HTMLInputElement;
    const tasksInput = document.getElementById('curriculum-tasks') as HTMLInputElement;

    if (!topicsInput || !objectivesInput || !tasksInput) {
      setTimeout(() => this.setupDurationConfiguration(), 1000);
      return;
    }

    contentVolumeRadios.forEach((radio) => {
      radio.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked && ContentLoadService.isDurationPresetKey(target.value)) {
          this.handleDurationSelection(target.value);
        }
      });
    });

    [topicsInput, objectivesInput, tasksInput].forEach((input) => {
      input.addEventListener('input', () => {
        this.handleInputChange(topicsInput, objectivesInput, tasksInput);
      });
      input.addEventListener('change', () => {
        this.handleInputChange(topicsInput, objectivesInput, tasksInput);
      });
    });

    this.autoSelectRecommendedDuration();
    this.populateInputsFromExistingCurriculum();
  }

  private handleInputChange(
    topicsInput: HTMLInputElement,
    objectivesInput: HTMLInputElement,
    tasksInput: HTMLInputElement,
  ): void {
    const config = this.getContentLoadConfig();
    const clamp = this.clampValue;

    if (!config) {
      return;
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    const topics = clamp(parseInt(topicsInput.value, 10) || 1, 1, 10);
    const objectives = clamp(parseInt(objectivesInput.value, 10) || 1, 1, 5);
    const tasks = clamp(parseInt(tasksInput.value, 10) || 1, 1, 5);

    topicsInput.value = topics.toString();
    objectivesInput.value = objectives.toString();
    tasksInput.value = tasks.toString();

    config.topicsPerLesson = topics;
    config.objectivesPerTopic = objectives;
    config.tasksPerObjective = tasks;
    this.setContentLoadConfig(config);

    this.saveTimeout = window.setTimeout(() => {
      void this.regenerateAndSaveCurriculum();
    }, 500);
  }

  private autoSelectRecommendedDuration(): void {
    const scheduledDuration = this.getScheduledLessonDuration();
    if (scheduledDuration <= 0) {
      return;
    }

    const recommendedType = ContentLoadService.getPresetKeyForDuration(scheduledDuration);
    if (!this.getContentLoadConfig()) {
      const config = ContentLoadService.determineContentLoad(
        scheduledDuration,
        (topics) => this.computeCompetencies(topics),
      );
      this.setContentLoadConfig(config);
    }

    const config = this.getContentLoadConfig();
    const typeToHighlight = config?.type || recommendedType;
    if (ContentLoadService.isDurationPresetKey(typeToHighlight)) {
      this.setDurationRadioState(typeToHighlight);
    }
    this.syncStructureInputsWithConfig();
  }

  private syncStructureInputsWithConfig(): void {
    const topicsInput = document.getElementById("curriculum-topics") as HTMLInputElement | null;
    const objectivesInput = document.getElementById("curriculum-objectives") as HTMLInputElement | null;
    const tasksInput = document.getElementById("curriculum-tasks") as HTMLInputElement | null;
    const config = this.getContentLoadConfig();

    if (!topicsInput || !objectivesInput || !tasksInput || !config) {
      return;
    }

    topicsInput.value = config.topicsPerLesson.toString();
    objectivesInput.value = config.objectivesPerTopic.toString();
    tasksInput.value = config.tasksPerObjective.toString();
  }

  private setDurationRadioState(durationType: DurationPresetKey): void {
    const targetRadio = document.querySelector<HTMLInputElement>(
      `input[name="content-volume"][value="${durationType}"]`,
    );
    if (targetRadio) {
      targetRadio.checked = true;
    }
  }

  private setDurationButtonVisualState(durationType: DurationPresetKey): void {
    this.setDurationRadioState(durationType);
  }

  private ensureContentLoadConfigFromCounts(counts: {
    topics: number;
    objectives: number;
    tasksPerObjective: number;
  }): void {
    const duration = this.getContentLoadConfig()?.duration || this.getScheduledLessonDuration();
    const durationType =
      this.getContentLoadConfig()?.type ||
      ContentLoadService.getPresetKeyForDuration(duration);

    const config: ContentLoadConfig = {
      type: durationType,
      duration,
      topicsPerLesson: counts.topics,
      competenciesPerLesson: this.computeCompetencies(counts.topics),
      objectivesPerTopic: counts.objectives,
      tasksPerObjective: counts.tasksPerObjective,
      isRecommended: ContentLoadService.isRecommendedDuration(durationType, duration),
      recommendationText: ContentLoadService.getRecommendationText(durationType, duration),
    };

    this.setContentLoadConfig(config);
  }

  private deriveStructureFromCurriculum(): {
    topics: number;
    objectives: number;
    tasksPerObjective: number;
  } | null {
    const curriculum = this.getCurrentCurriculum();
    if (!curriculum.length) {
      return null;
    }

    const firstLesson = curriculum[0];
    if (!firstLesson?.topics?.length) {
      return null;
    }

    const topicsCount = this.clampValue(firstLesson.topics.length, 1, 10);
    const firstTopic = firstLesson.topics[0];
    const objectivesCountRaw = Array.isArray(firstTopic?.objectives)
      ? firstTopic.objectives.length
      : 0;
    const tasksCountRaw = Array.isArray(firstTopic?.tasks) ? firstTopic.tasks.length : 0;

    const objectives = this.clampValue(objectivesCountRaw || 1, 1, 5);
    const tasksPerObjectiveCount =
      objectives > 0 ? Math.ceil(tasksCountRaw / objectives) || 1 : 1;
    const tasksPerObjective = this.clampValue(tasksPerObjectiveCount, 1, 5);

    return {
      topics: topicsCount,
      objectives,
      tasksPerObjective,
    };
  }

  private clampValue(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
