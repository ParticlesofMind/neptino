export interface DurationPreset {
  type: "mini" | "single" | "double" | "triple" | "halfFull" | "fullDay";
  maxDuration: number;
  defaultTopics: number;
  defaultObjectives: number;
  defaultTasks: number;
  rationale: string;
}

export interface ContentLoadConfig {
  type: "mini" | "single" | "double" | "triple" | "halfFull";
  duration: number;
  topicsPerLesson: number;
  competenciesPerLesson: number;
  objectivesPerTopic: number;
  tasksPerObjective: number;
  isRecommended: boolean;
  recommendationText: string;
}

const DURATION_PRESETS: Record<
  "mini" | "single" | "double" | "triple" | "halfFull" | "fullDay",
  DurationPreset
> = {
  mini: {
    type: "mini",
    maxDuration: 30,
    defaultTopics: 1,
    defaultObjectives: 1,
    defaultTasks: 2,
    rationale: "One tight focus with two quick practice reps.",
  },
  single: {
    type: "single",
    maxDuration: 60,
    defaultTopics: 2,
    defaultObjectives: 1,
    defaultTasks: 2,
    rationale: "Two short topics; one objective each; two reps to lock in.",
  },
  double: {
    type: "double",
    maxDuration: 120,
    defaultTopics: 2,
    defaultObjectives: 2,
    defaultTasks: 2,
    rationale: "Balanced two-hour block: 2×2×2 for eight solid tasks.",
  },
  triple: {
    type: "triple",
    maxDuration: 180,
    defaultTopics: 3,
    defaultObjectives: 2,
    defaultTasks: 2,
    rationale: "Broader scope; keep per-objective load steady.",
  },
  halfFull: {
    type: "halfFull",
    maxDuration: 240,
    defaultTopics: 3,
    defaultObjectives: 3,
    defaultTasks: 2,
    rationale: "Half-day: three topics with three objectives; two tasks each.",
  },
  fullDay: {
    type: "fullDay",
    maxDuration: 480,
    defaultTopics: 4,
    defaultObjectives: 3,
    defaultTasks: 2,
    rationale: "Full day pacing without fatigue; steady 4–5 tasks/hour.",
  },
};

export type DurationPresetKey = keyof typeof DURATION_PRESETS;

export class ContentLoadService {
  static calculateLessonDuration(
    startTime: string,
    endTime: string,
    breakTimes?: Array<{ startTime: string; endTime: string }>,
  ): number {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    let totalMinutes = Math.abs(end.getTime() - start.getTime()) / (1000 * 60);

    if (breakTimes && breakTimes.length > 0) {
      breakTimes.forEach((breakTime) => {
        const breakStart = new Date(`2000-01-01T${breakTime.startTime}`);
        const breakEnd = new Date(`2000-01-01T${breakTime.endTime}`);
        const breakDuration = Math.abs(breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
        totalMinutes -= breakDuration;
      });
    }

    return Math.max(0, totalMinutes);
  }

  static determineContentLoad(
    duration: number,
    computeCompetencies: (topics: number) => number,
  ): ContentLoadConfig {
    const presetKey = this.getPresetKeyForDuration(duration);
    const preset = this.getPreset(presetKey);
    const isRecommended = this.isRecommendedDuration(presetKey, duration);

    return {
      type: preset.type === "fullDay" ? "halfFull" : preset.type,
      duration,
      topicsPerLesson: preset.defaultTopics,
      competenciesPerLesson: computeCompetencies(preset.defaultTopics),
      objectivesPerTopic: preset.defaultObjectives,
      tasksPerObjective: preset.defaultTasks,
      isRecommended,
      recommendationText: this.getRecommendationText(presetKey, duration),
    };
  }

  static getPresetKeyForDuration(duration: number): DurationPresetKey {
    if (duration <= 30) {
      return "mini";
    }
    if (duration <= 60) {
      return "single";
    }
    if (duration <= 120) {
      return "double";
    }
    if (duration <= 180) {
      return "triple";
    }
    if (duration <= 240) {
      return "halfFull";
    }
    return "halfFull";
  }

  static getPreset(durationType: DurationPresetKey): DurationPreset {
    return DURATION_PRESETS[durationType];
  }

  static isDurationPresetKey(value: string | undefined): value is DurationPresetKey {
    return Boolean(value && value in DURATION_PRESETS);
  }

  static isRecommendedDuration(
    durationType: DurationPresetKey,
    actualDuration: number,
  ): boolean {
    if (durationType === "halfFull") {
      return actualDuration > 180;
    }
    const previousMax = this.getPreviousMaxDuration(durationType);
    return actualDuration > previousMax && actualDuration <= this.getPreset(durationType).maxDuration;
  }

  static getRecommendationText(
    durationType: DurationPresetKey,
    actualDuration: number,
  ): string {
    void durationType;
    void actualDuration;
    return "";
  }

  private static getPreviousMaxDuration(durationType: DurationPresetKey): number {
    switch (durationType) {
      case "mini":
        return 0;
      case "single":
        return 30;
      case "double":
        return 60;
      case "triple":
        return 120;
      case "halfFull":
        return 180;
      default:
        return 0;
    }
  }
}
