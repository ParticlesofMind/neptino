import type {
  CurriculumLesson,
  CurriculumModule,
  TemplatePlacementChoice,
  TemplatePlacementConfig,
  TemplateSummary,
} from "./curriculumManager.js";

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export class TemplatePlacementService {
  static syncWithTemplates(
    placements: TemplatePlacementConfig[],
    templates: TemplateSummary[],
  ): TemplatePlacementConfig[] {
    if (!placements.length || !templates.length) {
      return placements;
    }

    const summaryById = new Map(templates.map((template) => [template.id, template]));
    const summaryBySlug = new Map(
      templates
        .filter((template) => typeof template.templateId === "string" && template.templateId.length > 0)
        .map((template) => [template.templateId!, template]),
    );

    return placements.map((placement) => {
      let summary = summaryById.get(placement.templateId);
      if (!summary) {
        const slugCandidate = placement.templateSlug || placement.templateId;
        if (slugCandidate) {
          summary = summaryBySlug.get(slugCandidate);
        }
      }

      if (summary) {
        return {
          ...placement,
          templateId: summary.id,
          templateSlug: summary.templateId,
          templateName: summary.name,
        };
      }

      return placement;
    });
  }

  static syncWithModules(
    placements: TemplatePlacementConfig[],
    modules: CurriculumModule[],
  ): TemplatePlacementConfig[] {
    if (!placements.length || !modules.length) {
      return placements;
    }

    const validModuleNumbers = new Set(
      modules.map((module) => (typeof module.moduleNumber === "number" ? module.moduleNumber : 1)),
    );

    return placements.map((placement) => {
      if (placement.placementType !== "specific-modules") {
        return placement;
      }

      const filtered = (placement.moduleNumbers ?? []).filter((number) => validModuleNumbers.has(number));
      return { ...placement, moduleNumbers: filtered };
    });
  }

  static syncWithLessons(
    placements: TemplatePlacementConfig[],
    lessons: CurriculumLesson[],
  ): TemplatePlacementConfig[] {
    if (!placements.length || !lessons.length) {
      return placements;
    }

    const validLessonNumbers = new Set(
      lessons.map((lesson) => lesson.lessonNumber).filter((number): number is number => isNumber(number)),
    );

    return placements.map((placement) => {
      if (placement.placementType !== "specific-lessons") {
        return placement;
      }

      const filtered = (placement.lessonNumbers ?? []).filter((number) => validLessonNumbers.has(number));
      return { ...placement, lessonNumbers: filtered };
    });
  }

  static applyToLessons(placements: TemplatePlacementConfig[], lessons: CurriculumLesson[]): void {
    if (!placements.length || !lessons.length) {
      return;
    }

    const lessonTemplatePlacements = placements.filter(
      (placement) =>
        placement.placementType === "all-lessons" ||
        placement.placementType === "lesson-ranges" ||
        placement.placementType === "specific-lessons",
    );

    if (!lessonTemplatePlacements.length) {
      return;
    }

    lessons.forEach((lesson) => {
      const lessonNumber = lesson.lessonNumber ?? 0;
      const applicablePlacement = lessonTemplatePlacements.find((placement) => {
        if (placement.placementType === "all-lessons") {
          return true;
        }

        if (
          placement.placementType === "specific-lessons" &&
          placement.lessonNumbers?.includes(lessonNumber)
        ) {
          return true;
        }

        if (placement.placementType === "lesson-ranges" && Array.isArray(placement.lessonRanges)) {
          return placement.lessonRanges.some(
            (range) =>
              typeof range.start === "number" &&
              typeof range.end === "number" &&
              lessonNumber >= range.start &&
              lessonNumber <= range.end,
          );
        }

        return false;
      });

      if (applicablePlacement) {
        lesson.templateId = applicablePlacement.templateId;
      }
    });
  }

  static findPlacement(
    templateId: string,
    placements: TemplatePlacementConfig[],
    templates: TemplateSummary[],
  ): TemplatePlacementConfig | undefined {
    const directMatch = placements.find((placement) => placement.templateId === templateId);
    if (directMatch) {
      return directMatch;
    }

    const summary = templates.find((template) => template.id === templateId);
    const slugCandidates = new Set<string>();
    if (summary?.templateId) {
      slugCandidates.add(summary.templateId);
    }
    if (templateId) {
      slugCandidates.add(templateId);
    }

    return placements.find((placement) => {
      const slugMatch = placement.templateSlug && slugCandidates.has(placement.templateSlug);
      const idMatch = placement.templateId && slugCandidates.has(placement.templateId);
      return Boolean(slugMatch || idMatch);
    });
  }

  static lookupTemplateSummary(
    templateId: string | null | undefined,
    templates: TemplateSummary[],
  ): TemplateSummary | undefined {
    if (!templateId) {
      return undefined;
    }

    return templates.find((template) => template.id === templateId);
  }

  static updatePlacementChoice(
    placements: TemplatePlacementConfig[],
    templates: TemplateSummary[],
    templateId: string,
    choice: TemplatePlacementChoice,
    lessonCount: number,
  ): TemplatePlacementConfig[] {
    if (choice === "none") {
      return placements.filter((placement) => placement.templateId !== templateId);
    }

    const existing = this.findPlacement(templateId, placements, templates);
    const summary = templates.find((template) => template.id === templateId);
    const placementType = choice as Exclude<TemplatePlacementChoice, "none">;

    const updated: TemplatePlacementConfig = {
      templateId,
      templateSlug: summary?.templateId || existing?.templateSlug || templateId,
      templateName: summary?.name || existing?.templateName || summary?.templateId || templateId,
      placementType,
      moduleNumbers: placementType === "specific-modules" ? [...(existing?.moduleNumbers ?? [])] : undefined,
      lessonNumbers: placementType === "specific-lessons" ? [...(existing?.lessonNumbers ?? [])] : undefined,
      lessonRanges:
        placementType === "lesson-ranges"
          ? [...(existing?.lessonRanges ?? [{ start: 1, end: lessonCount || 1 }])]
          : undefined,
    };

    if (existing) {
      return placements.map((placement) => (placement.templateId === templateId ? updated : placement));
    }

    return [...placements, updated];
  }

  static toggleModuleSelection(
    placements: TemplatePlacementConfig[],
    templates: TemplateSummary[],
    templateId: string,
    moduleNumber: number,
    isChecked: boolean,
    lessonCount: number,
  ): TemplatePlacementConfig[] {
    let result = placements;
    let placement = this.findPlacement(templateId, result, templates);
    if (!placement || placement.placementType !== "specific-modules") {
      result = this.updatePlacementChoice(result, templates, templateId, "specific-modules", lessonCount);
      placement = this.findPlacement(templateId, result, templates);
    }

    if (!placement) {
      return result;
    }

    const moduleNumbers = Array.isArray(placement.moduleNumbers) ? [...placement.moduleNumbers] : [];
    if (isChecked) {
      if (!moduleNumbers.includes(moduleNumber)) {
        moduleNumbers.push(moduleNumber);
      }
    } else {
      const index = moduleNumbers.indexOf(moduleNumber);
      if (index >= 0) {
        moduleNumbers.splice(index, 1);
      }
    }

    moduleNumbers.sort((a, b) => a - b);
    const updatedPlacement = { ...placement, moduleNumbers };

    return result.map((entry) => (entry.templateId === templateId ? updatedPlacement : entry));
  }

  static toggleLessonSelection(
    placements: TemplatePlacementConfig[],
    templates: TemplateSummary[],
    templateId: string,
    lessonNumber: number,
    isChecked: boolean,
    lessonCount: number,
  ): TemplatePlacementConfig[] {
    let result = placements;
    let placement = this.findPlacement(templateId, result, templates);
    if (!placement || placement.placementType !== "specific-lessons") {
      result = this.updatePlacementChoice(result, templates, templateId, "specific-lessons", lessonCount);
      placement = this.findPlacement(templateId, result, templates);
    }

    if (!placement) {
      return result;
    }

    const lessonNumbers = Array.isArray(placement.lessonNumbers) ? [...placement.lessonNumbers] : [];

    if (isChecked) {
      if (!lessonNumbers.includes(lessonNumber)) {
        lessonNumbers.push(lessonNumber);
      }
    } else {
      const index = lessonNumbers.indexOf(lessonNumber);
      if (index >= 0) {
        lessonNumbers.splice(index, 1);
      }
    }

    lessonNumbers.sort((a, b) => a - b);
    const updatedPlacement = { ...placement, lessonNumbers };

    return result.map((entry) => (entry.templateId === templateId ? updatedPlacement : entry));
  }

  static addLessonRange(
    placements: TemplatePlacementConfig[],
    templates: TemplateSummary[],
    templateId: string,
    lessonCount: number,
  ): TemplatePlacementConfig[] {
    let result = placements;
    let placement = this.findPlacement(templateId, result, templates);
    if (!placement || placement.placementType !== "lesson-ranges") {
      result = this.updatePlacementChoice(result, templates, templateId, "lesson-ranges", lessonCount);
      placement = this.findPlacement(templateId, result, templates);
    }

    if (!placement) {
      return result;
    }

    const lessonRanges = Array.isArray(placement.lessonRanges) ? [...placement.lessonRanges] : [];
    lessonRanges.push({ start: 1, end: lessonCount || 1 });

    const updatedPlacement = { ...placement, lessonRanges };
    return result.map((entry) => (entry.templateId === templateId ? updatedPlacement : entry));
  }

  static removeLessonRange(
    placements: TemplatePlacementConfig[],
    templateId: string,
    rangeIndex: number,
  ): TemplatePlacementConfig[] {
    const placement = placements.find((entry) => entry.templateId === templateId);
    if (!placement) {
      return placements;
    }

    const lessonRanges = Array.isArray(placement.lessonRanges) ? [...placement.lessonRanges] : [];
    lessonRanges.splice(rangeIndex, 1);

    const updatedPlacement = { ...placement, lessonRanges };
    return placements.map((entry) => (entry.templateId === templateId ? updatedPlacement : entry));
  }

  static updateLessonRange(
    placements: TemplatePlacementConfig[],
    templateId: string,
    rangeIndex: number,
    isStart: boolean,
    value: number,
  ): TemplatePlacementConfig[] {
    const placement = placements.find((entry) => entry.templateId === templateId);
    if (!placement || !Array.isArray(placement.lessonRanges)) {
      return placements;
    }

    const lessonRanges = [...placement.lessonRanges];
    if (!lessonRanges[rangeIndex]) {
      return placements;
    }

    const range = { ...lessonRanges[rangeIndex] };
    if (isStart) {
      range.start = Math.max(1, Math.min(value, range.end));
    } else {
      range.end = Math.max(range.start, value);
    }

    lessonRanges[rangeIndex] = range;
    const updatedPlacement = { ...placement, lessonRanges };
    return placements.map((entry) => (entry.templateId === templateId ? updatedPlacement : entry));
  }
}
