import {
  CurriculumLesson,
  CurriculumModule,
  TemplatePlacementConfig,
  TemplateSummary,
  ModuleOrganizationType,
  CurriculumTopic,
} from "./curriculumManager";
import { TEMPLATE_TYPE_LABELS } from "../templates/templateOptions";
import type { CanvasLessonSummary } from "./CanvasSummaryService";
import { setButtonActive } from "../../../utils/tailwindState";

type PreviewMode = "modules" | "titles" | "competencies" | "topics" | "objectives" | "tasks" | "all";

export class CurriculumRenderer {
  private curriculumPreviewSection!: HTMLElement;
  private templatePlacementList: HTMLElement | null = null;
  private currentCurriculum: CurriculumLesson[] = [];
  private currentModules: CurriculumModule[] = [];
  private currentPreviewMode: PreviewMode = "all";
  private scheduledLessonDuration: number = 0;
  private availableTemplates: TemplateSummary[] = [];
  private templatePlacements: TemplatePlacementConfig[] = [];
  private courseType: "minimalist" | "essential" | "complete" | "custom" = "essential";
  private moduleOrganization: ModuleOrganizationType = "linear";
  private canvasSummaries: CanvasLessonSummary[] = [];
  private canvasSummaryLookup: Map<number, CanvasLessonSummary> = new Map();
    private readonly templateAccentPalette: string[] = [
    "border-sky-200 bg-sky-50 text-sky-700",
    "border-violet-200 bg-violet-50 text-violet-700",
    "border-amber-200 bg-amber-50 text-amber-700",
    "border-teal-200 bg-teal-50 text-teal-700",
    "border-rose-200 bg-rose-50 text-rose-700",
    "border-slate-200 bg-slate-50 text-slate-700",
    "border-blue-200 bg-blue-50 text-blue-700",
    "border-emerald-200 bg-emerald-50 text-emerald-700",
    "border-orange-200 bg-orange-50 text-orange-700",
    "border-yellow-200 bg-yellow-50 text-yellow-700",
  ];
  private readonly templateAccentByType: Record<string, string> = {
    assessment: "border-teal-200 bg-teal-50 text-teal-700",
    quiz: "border-violet-200 bg-violet-50 text-violet-700",
    exam: "border-rose-200 bg-rose-50 text-rose-700",
    lesson: "border-sky-200 bg-sky-50 text-sky-700",
    certificate: "border-yellow-200 bg-yellow-50 text-yellow-700",
  };

  constructor(
    curriculumPreviewSection: HTMLElement,
    templatePlacementList: HTMLElement | null,
  ) {
    this.curriculumPreviewSection = curriculumPreviewSection;
    this.templatePlacementList = templatePlacementList;
  }

  public updateData(data: {
    currentCurriculum: CurriculumLesson[];
    currentModules: CurriculumModule[];
    currentPreviewMode: PreviewMode;
    scheduledLessonDuration: number;
    availableTemplates: TemplateSummary[];
    templatePlacements: TemplatePlacementConfig[];
    courseType: "minimalist" | "essential" | "complete" | "custom";
    moduleOrganization: ModuleOrganizationType;
    canvasSummaries?: CanvasLessonSummary[];
  }) {
    this.currentCurriculum = data.currentCurriculum;
    this.currentModules = data.currentModules;
    this.currentPreviewMode = data.currentPreviewMode;
    this.scheduledLessonDuration = data.scheduledLessonDuration;
    this.availableTemplates = data.availableTemplates;
    this.templatePlacements = data.templatePlacements;
    this.courseType = data.courseType;
    this.moduleOrganization = data.moduleOrganization;
    this.canvasSummaries = data.canvasSummaries ?? [];
    this.canvasSummaryLookup = new Map(
      this.canvasSummaries.map((summary) => [summary.lessonNumber, summary]),
    );
  }

  public render(): void {
    this.renderCurriculumPreview();
    this.renderTemplatePlacementUI();
  }

  public renderCurriculumPreview(onRenderComplete?: () => void): void {
    const previewContainer = this.curriculumPreviewSection.querySelector(
      ".editable-surface",
    );
    if (!previewContainer) {
      onRenderComplete?.();
      return;
    }

    const placeholder = this.curriculumPreviewSection.querySelector(
      "[data-article-preview-placeholder]",
    ) as HTMLElement | null;
    if (placeholder) {
      placeholder.hidden = this.currentCurriculum.length > 0;
    }

    this.renderPreviewContent(previewContainer, onRenderComplete);
  }

  private renderPreviewContent(previewContainer: Element, onRenderComplete?: () => void): void {
    if (!Array.isArray(this.currentCurriculum)) {
      onRenderComplete?.();
      return;
    }

    const modulesForPreview = this.currentModules.length
      ? this.currentModules
      : this.currentCurriculum.length
        ? this.organizeLessonsIntoModules([...this.currentCurriculum])
        : [];

    const moduleByNumber = new Map<number, CurriculumModule>();
    const lessonToModuleNumber = new Map<number, number>();
    const moduleLastLesson = new Map<number, number>();

    modulesForPreview.forEach((module) => {
      moduleByNumber.set(module.moduleNumber, module);
      const lessonsInModule = Array.isArray(module.lessons) ? module.lessons : [];
      if (lessonsInModule.length > 0) {
        const lastLesson = lessonsInModule[lessonsInModule.length - 1];
        moduleLastLesson.set(module.moduleNumber, lastLesson.lessonNumber);
      }
      lessonsInModule.forEach((lesson) => {
        lessonToModuleNumber.set(lesson.lessonNumber, module.moduleNumber);
      });
    });

    const courseEndPlacements = this.getTemplatePlacementsForCourseEnd();

    previewContainer.innerHTML = '<div class="loading-state text-sm text-neutral-500">Loading curriculum...</div>';

    let html = "";

    if (this.currentCurriculum.length === 0) {
      html = `
       <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center" data-curriculum-empty>
         <div class="mx-auto h-8 w-8 rounded-full bg-neutral-200"></div>
         <div class="mt-3 text-base font-semibold text-neutral-800">No Curriculum Generated Yet</div>
         <div class="mt-1 text-sm text-neutral-500">
           Configure your lesson settings and generate a curriculum to see the preview.
         </div>
       </div>`;
    } else if (this.currentPreviewMode === "modules") {
      if (modulesForPreview.length === 0) {
        html = `
         <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center" data-curriculum-empty>
           <div class="text-base font-semibold text-neutral-800">Linear Organization</div>
           <div class="mt-1 text-sm text-neutral-500">
             No modules in linear mode. Switch to "Lesson Titles" to view all lessons.
           </div>
         </div>`;
      } else {
        modulesForPreview.forEach((module) => {
          const moduleNumber = typeof module.moduleNumber === "number" ? module.moduleNumber : 1;
          const moduleTitleSource = module.title ? module.title.trim() : "";
          const moduleTitle = moduleTitleSource.length
            ? this.escapeHtml(moduleTitleSource)
            : `Module ${moduleNumber}`;

          html += `
          <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-module-card data-module-number="${moduleNumber}">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="flex items-center gap-3">
                <span class="inline-flex items-center rounded-full bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white" aria-hidden="true" data-module-chip>Module ${moduleNumber}</span>
                <h2
                  class="text-lg font-semibold text-neutral-900"
                  contenteditable="true"
                  data-module="${moduleNumber}"
                  data-field="title"
                  data-placeholder="Click to add module title...">
                  ${moduleTitle}
                </h2>
              </div>
              <div class="text-sm text-neutral-500">
                <span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5">${module.lessons.length} lessons</span>
              </div>
            </div>
            <div class="mt-4 space-y-4" data-module-body>
              <div class="space-y-3" data-module-lessons>`;

          module.lessons.forEach((lesson) => {
            const lessonHeader = this.renderLessonHeader(lesson, {
              titleEditable: true,
              placeholder: "Click to add lesson title...",
            });

            html += `
                <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3" data-lesson-card>
                  ${lessonHeader}
                </div>`;
          });

          html += `
              </div>`;

          const modulePlacements = this.getTemplatePlacementsForModule(moduleNumber);
          if (modulePlacements.length) {
            html += `<div class="space-y-3" data-module-templates>`;
            modulePlacements.forEach((placement) => {
              html += this.renderTemplateBlock(placement, "module", {
                ...module,
                moduleNumber,
              });
            });
            html += `</div>`;
          }

          html += `
            </div>
          </div>`;
        });

        courseEndPlacements.forEach((placement) => {
          html += this.renderTemplateBlock(placement, "course");
        });
      }
    } else {
      this.currentCurriculum.forEach((lesson) => {
        const lessonHeader = this.renderLessonHeader(lesson, {
          titleEditable:
            this.currentPreviewMode === "all" || this.currentPreviewMode === "titles",
          placeholder: "Click to add lesson title...",
        });

        if (this.currentPreviewMode === "all") {
          const metaItems: string[] = [];
          const summary = this.canvasSummaryLookup.get(lesson.lessonNumber ?? 0);
          if (summary) {
            metaItems.push(
              `<span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5">${summary.duration} minutes</span>`,
            );
            metaItems.push(
              `<span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5">${this.escapeHtml(summary.method)}</span>`,
            );
            if (summary.structure?.topics) {
              metaItems.push(
                `<span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5">${summary.structure.topics} topics</span>`,
              );
            } else {
              metaItems.push(
                `<span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5">${lesson.topics.length} topics</span>`,
              );
            }
          } else {
            if (this.scheduledLessonDuration) {
              metaItems.push(
                `<span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5">${this.scheduledLessonDuration} minutes</span>`,
              );
            }
            metaItems.push(
              `<span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5">${lesson.topics.length} topics</span>`,
            );
          }
          const metaHtml = metaItems.length
            ? `<div class="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500" data-lesson-meta>${metaItems.join("")}</div>`
            : "";

          html += `
           <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-lesson-card>
             ${lessonHeader}
             ${metaHtml}`;

          lesson.topics.forEach((topic, topicIndex) => {
            html += `
             <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3" data-topic-card>
               <h4 class="text-sm font-semibold text-neutral-900" contenteditable="true" data-topic-title
                    data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title"
                    data-placeholder="Click to add topic title...">
                 ${topic.title || `Topic ${topicIndex + 1}`}
               </h4>

               <div class="mt-2 space-y-2" data-topic-objectives>`;

            topic.objectives.forEach((objective, objIndex) => {
              html += `
                 <div class="rounded-md border border-neutral-200 bg-white p-2" data-objective-group>
                   <div class="text-sm font-medium text-neutral-700">
                     <span class="block" contenteditable="true" data-objective-text
                           data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-objective="${objIndex}"
                           data-field="objective"
                           data-placeholder="Click to add learning objective...">
                       ${objective || `Objective ${objIndex + 1}`}
                     </span>
                   </div>`;

              if (topic.tasks && topic.tasks.length > 0 && topic.objectives.length > 0) {
                const tasksPerObjective = 2;
                const startTaskIndex = objIndex * tasksPerObjective;
                const endTaskIndex = Math.min(startTaskIndex + tasksPerObjective, topic.tasks.length);

                if (startTaskIndex < topic.tasks.length) {
                  html += `
                   <div class="mt-2" data-objective-tasks>
                     <ul class="list-none space-y-1 text-sm text-neutral-700" data-task-list>`;

                  for (let taskIdx = startTaskIndex; taskIdx < endTaskIndex; taskIdx++) {
                    if (topic.tasks[taskIdx] !== undefined) {
                      html += `
                         <li class="rounded-md border border-neutral-200 bg-white px-2 py-1" contenteditable="true" data-task-item
                             data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-task="${taskIdx}"
                             data-field="task"
                             data-placeholder="Click to add task...">
                           ${topic.tasks[taskIdx] || `Task ${(taskIdx % tasksPerObjective) + 1}`}
                         </li>`;
                    }
                  }

                  html += `
                     </ul>
                   </div>`;
                }
              }

              html += `
                 </div>`;
            });

            html += `
               </div>
             </div>`;
          });

          html += `</div>`;

        } else if (this.currentPreviewMode === "titles") {
          html += `
           <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm" data-lesson-card data-lesson-variant="simple">
             ${lessonHeader}
           </div>`;

        } else if (this.currentPreviewMode === "competencies") {
          const competencies = this.getLessonCompetenciesForPreview(lesson);
          let topicCounter = 0;
          html += `
           <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-lesson-card data-lesson-variant="competencies">
             ${lessonHeader}`;

          if (!competencies.length) {
            html += `
             <p class="text-sm text-neutral-500">No competencies defined yet. Add topics to build your competency structure.</p>`;
          }

          competencies.forEach((competency, competencyIndex) => {
            const competencyTitle =
              competency.title && competency.title.trim().length
                ? competency.title.trim()
                : `Competency ${competencyIndex + 1}`;

            html += `
             <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3" data-competency-card>
               <h4 class="text-sm font-semibold text-neutral-900" contenteditable="true" data-competency-title
                    data-lesson="${lesson.lessonNumber}" data-competency="${competencyIndex}"
                    data-field="competency-title"
                    data-placeholder="Click to add competency title...">
                 ${this.escapeHtml(competencyTitle)}
               </h4>`;

            if (competency.topics.length) {
              html += `<ul class="mt-2 space-y-2" data-competency-topics>`;
              competency.topics.forEach((topic) => {
                const topicTitle =
                  topic.title && topic.title.trim().length
                    ? topic.title.trim()
                    : `Topic ${topicCounter + 1}`;

                html += `
                 <li class="rounded-md border border-neutral-200 bg-white p-2" data-competency-topic>
                   <span class="text-sm font-medium text-neutral-800" contenteditable="true" data-topic-title
                         data-lesson="${lesson.lessonNumber}"
                         data-competency="${competencyIndex}"
                         data-topic="${topicCounter}"
                         data-field="title"
                         data-placeholder="Click to add topic title...">
                     ${this.escapeHtml(topicTitle)}
                   </span>
                 </li>`;

                topicCounter += 1;
              });
              html += `</ul>`;
            } else {
              html += `<p class="text-sm text-neutral-500" data-competency-topics-empty>No topics assigned yet.</p>`;
            }

            html += `</div>`;
          });

          html += `</div>`;

        } else if (this.currentPreviewMode === "topics") {
          html += `
           <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-lesson-card data-lesson-variant="topics">
             ${lessonHeader}`;

          lesson.topics.forEach((topic, topicIndex) => {
            html += `
             <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3" data-topic-card>
               <h4 class="text-sm font-semibold text-neutral-900" contenteditable="true" data-topic-title
                    data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title"
                    data-placeholder="Click to add topic title...">
                 ${topic.title || `Topic ${topicIndex + 1}`}
               </h4>
             </div>`;
          });

          html += `</div>`;

        } else if (this.currentPreviewMode === "objectives") {
          html += `
           <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-lesson-card data-lesson-variant="objectives">
             ${lessonHeader}`;

          lesson.topics.forEach((topic, topicIndex) => {
            html += `
             <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3" data-topic-card>
               <h4 class="text-sm font-semibold text-neutral-900" contenteditable="false" data-topic-title
                    data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title">
                 ${topic.title || `Topic ${topicIndex + 1}`}
               </h4>

               <div class="mt-2 space-y-2" data-topic-objectives>`;

            topic.objectives.forEach((objective, objIndex) => {
              html += `
                 <div class="rounded-md border border-neutral-200 bg-white p-2" data-objective-group>
                   <div class="text-sm font-medium text-neutral-700">
                     <span class="block" contenteditable="true" data-objective-text
                           data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-objective="${objIndex}"
                           data-field="objective"
                           data-placeholder="Click to add learning objective...">
                       ${objective || `Objective ${objIndex + 1}`}
                     </span>
                   </div>
                 </div>`;
            });

            html += `
               </div>
             </div>`;
          });

          html += `</div>`;

        } else if (this.currentPreviewMode === "tasks") {
          html += `
           <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" data-lesson-card data-lesson-variant="tasks">
             ${lessonHeader}`;

          lesson.topics.forEach((topic, topicIndex) => {
            html += `
             <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3" data-topic-card>
               <h4 class="text-sm font-semibold text-neutral-900" contenteditable="false" data-topic-title
                    data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title">
                 ${topic.title || `Topic ${topicIndex + 1}`}
               </h4>

               <div class="mt-2 space-y-2" data-topic-objectives>`;

            topic.objectives.forEach((objective, objIndex) => {
              html += `
                 <div class="rounded-md border border-neutral-200 bg-white p-2" data-objective-group>
                   <div class="text-sm font-medium text-neutral-700">
                     <span class="block" contenteditable="false" data-objective-text
                           data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-objective="${objIndex}">
                       ${objective || `Objective ${objIndex + 1}`}
                     </span>
                   </div>`;

              if (topic.tasks && topic.tasks.length > 0 && topic.objectives.length > 0) {
                const tasksPerObjective = 2;
                const startTaskIndex = objIndex * tasksPerObjective;
                const endTaskIndex = Math.min(startTaskIndex + tasksPerObjective, topic.tasks.length);

                html += `
                   <div class="mt-2" data-objective-tasks>
                     <ul class="list-none space-y-1 text-sm text-neutral-700" data-task-list>`;

                for (let taskIdx = startTaskIndex; taskIdx < endTaskIndex; taskIdx++) {
                  if (topic.tasks[taskIdx] !== undefined) {
                    html += `
                         <li class="rounded-md border border-neutral-200 bg-white px-2 py-1" contenteditable="true" data-task-item
                             data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-task="${taskIdx}"
                             data-field="task"
                             data-placeholder="Click to add task...">
                           ${topic.tasks[taskIdx] || `Task ${(taskIdx % tasksPerObjective) + 1}`}
                         </li>`;
                  }
                }

                html += `
                     </ul>
                   </div>`;
              }

              html += `
                 </div>`;
            });

            html += `
               </div>
             </div>`;
          });

          html += `</div>`;
        }

        const moduleNumber = lessonToModuleNumber.get(lesson.lessonNumber);
        if (
          moduleNumber !== undefined &&
          moduleLastLesson.get(moduleNumber) === lesson.lessonNumber
        ) {
          const moduleContext = moduleByNumber.get(moduleNumber);
          const modulePlacements = this.getTemplatePlacementsForModule(moduleNumber);
          modulePlacements.forEach((placement) => {
            html += this.renderTemplateBlock(placement, "module", moduleContext);
          });
        }
      });

      courseEndPlacements.forEach((placement) => {
        html += this.renderTemplateBlock(placement, "course");
      });
    }

    previewContainer.setAttribute('data-loading', 'true');

    requestAnimationFrame(() => {
      setTimeout(() => {
        previewContainer.innerHTML = html;
        previewContainer.removeAttribute('data-loading');
        onRenderComplete?.();
      }, 50);
    });
  }

  private renderLessonHeader(
    lesson: CurriculumLesson,
    options: {
      titleEditable: boolean;
      placeholder?: string;
      showTemplateSelector?: boolean;
    },
  ): string {
    const { titleEditable, placeholder, showTemplateSelector = true } = options;
    const lessonNumber = lesson.lessonNumber ?? 0;
    const lessonTitle = lesson.title ? lesson.title.trim() : "";
    const rawTitle = lessonTitle.length
      ? this.escapeHtml(lessonTitle)
      : `Lesson ${lessonNumber}`;
    const placeholderText = placeholder || "Click to add lesson title...";
    const placeholderAttr = titleEditable
      ? ` data-placeholder="${this.escapeHtml(placeholderText)}"`
      : "";
    const templateControls = showTemplateSelector
      ? this.renderLessonTemplateSelector(lesson)
      : "";
    const summary = this.canvasSummaryLookup.get(lessonNumber);
    const summaryMeta = this.renderLessonMetaBadges(summary);

    return `
      <div class="flex flex-wrap items-start justify-between gap-4" data-lesson-header>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center rounded-full bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white" aria-hidden="true" data-lesson-chip>Lesson ${lessonNumber}</span>
          <h3
            class="text-base font-semibold text-neutral-900"
            contenteditable="${titleEditable ? "true" : "false"}"
            data-lesson="${lessonNumber}"
            data-field="title"${placeholderAttr}>
            ${rawTitle}
          </h3>
        </div>
        ${summaryMeta}
        ${templateControls}
      </div>
    `;
  }

  private renderLessonMetaBadges(summary?: CanvasLessonSummary): string {
    if (!summary) {
      return "";
    }

    const badges: string[] = [];
    badges.push(
      `<span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5">${summary.duration} minutes</span>`,
    );
    badges.push(
      `<span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5">${this.escapeHtml(summary.method)}</span>`,
    );

    if (summary.structure?.topics) {
      badges.push(
        `<span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5">${summary.structure.topics} topics</span>`,
      );
    }

    return badges.length
      ? `<div class="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500" data-lesson-meta>${badges.join("")}</div>`
      : "";
  }

  private getLessonCompetenciesForPreview(
    lesson: CurriculumLesson,
  ): Array<{ title: string; topics: CurriculumTopic[] }> {
    const competencySource = (lesson as unknown as { competencies?: Array<{ title?: string; topics?: CurriculumTopic[]; competencyNumber?: number }> })
      .competencies;

    if (Array.isArray(competencySource) && competencySource.length) {
      return competencySource.map((competency, index) => {
        const title =
          typeof competency.title === "string" && competency.title.trim().length
            ? competency.title.trim()
            : `Competency ${competency.competencyNumber ?? index + 1}`;
        const topics = Array.isArray(competency.topics) ? competency.topics : [];
        return {
          title,
          topics,
        };
      });
    }

    const topics = Array.isArray(lesson.topics) ? lesson.topics : [];
    if (!topics.length) {
      return [];
    }

    return topics.map((topic, index) => ({
      title: `Competency ${index + 1}`,
      topics: [topic],
    }));
  }

  private renderLessonTemplateSelector(lesson: CurriculumLesson): string {
    if (!this.availableTemplates.length) {
      return '';
    }

    const currentTemplateId = lesson.templateId || '';
    const currentTemplate = currentTemplateId
      ? this.lookupTemplateSummary(currentTemplateId)
      : null;

    const templatesByType = new Map<string, TemplateSummary[]>();
    this.availableTemplates.forEach(template => {
      const type = template.type || 'other';
      if (!templatesByType.has(type)) {
        templatesByType.set(type, []);
      }
      templatesByType.get(type)!.push(template);
    });

    let optionsHtml = '<option value="">No Template</option>';

    templatesByType.forEach((templates, type) => {
      const typeLabel = this.formatTemplateType(type);
      optionsHtml += `<optgroup label="${this.escapeHtml(typeLabel)}">`;

      templates.forEach(template => {
        const selected = template.id === currentTemplateId ? ' selected' : '';
        optionsHtml += `<option value="${this.escapeHtml(template.id)}"${selected}>${this.escapeHtml(template.name)}</option>`;
      });

      optionsHtml += '</optgroup>';
    });

    const accentClass = currentTemplate
      ? this.resolveTemplateAccentClass(currentTemplate.type, currentTemplate.id)
      : '';

    const badgeHtml = currentTemplate
      ? `<span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${accentClass}" data-template-badge>${this.escapeHtml(
        this.formatTemplateType(currentTemplate.type),
      )}</span>`
      : "";

    const selectId = `lesson-template-${lesson.lessonNumber}`;

    return `
     <div class="flex flex-wrap items-center gap-3" data-lesson-template-selector>
       <label class="text-xs font-medium text-neutral-500" for="${selectId}">
         <span>Template</span>
       </label>
       <div class="flex flex-wrap items-center gap-2">
         <select
           id="${selectId}"
           class="rounded-md border-0 py-1.5 text-xs text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600"
           data-lesson-number="${lesson.lessonNumber}"
           data-lesson-template-select>
           ${optionsHtml}
         </select>
         ${badgeHtml}
       </div>
     </div>
   `;
  }

  public renderTemplatePlacementUI(): void {
    if (!this.templatePlacementList) {
      return;
    }

    const templatesForUI = this.getFilteredTemplatesForCourseType();

    if (!templatesForUI.length) {
      const allowedTypes = this.getAllowedTemplateTypesForCourse();
      if (!allowedTypes || !allowedTypes.length) {
        this.templatePlacementList.innerHTML =
          '<p class="text-sm text-neutral-500" data-template-placement-empty>Create a template in the Templates tab to unlock placement options.</p>';
        return;
      }

      const allowedLabels = allowedTypes
        .map((type) => this.formatTemplateType(type))
        .join(", ");
      const emptyMessage = `No ${this.courseType} templates found. This course expects: ${allowedLabels}. Create a matching template in the Templates tab or switch to "Custom" to use every template.`;
      this.templatePlacementList.innerHTML =
        `<p class="text-sm text-neutral-500" data-template-placement-empty>${emptyMessage}</p>`;
      return;
    }

    const modules = this.getModulesForPlacement();
    const moduleCount = modules.length;
    const lessons = Array.isArray(this.currentCurriculum)
      ? this.currentCurriculum
      : [];
    const lessonCount = lessons.length;

    const moduleTitleLookup = new Map<number, string>();
    modules.forEach((module) => {
      const moduleNumber = module.moduleNumber ?? 1;
      const title = module.title && module.title.trim().length
        ? module.title
        : `Module ${moduleNumber}`;
      moduleTitleLookup.set(moduleNumber, title);
    });

    const html = templatesForUI
      .map((template) => {
        const placement = this.getTemplatePlacement(template.id);
        const choice = placement
          ? placement.placementType
          : "none";
        const moduleNumbers = placement?.moduleNumbers ?? [];
        const lessonNumbers = placement?.lessonNumbers ?? [];
        const lessonRanges = placement?.lessonRanges ?? [];
        const showModules = choice === "specific-modules";
        const showLessons = choice === "specific-lessons";
        const showLessonRanges = choice === "lesson-ranges";
        // Use normalized type for comparison to handle variations like "lesson", "Lesson", "lesson_template", etc.
        const normalizedTemplateType = this.normalizeTemplateTypeName(template.type);
        const isLessonTemplate = normalizedTemplateType === "lesson";
        const accentClass = template.isMissing
          ? ""
          : this.resolveTemplateAccentClass(
            template.type,
            template.id || template.templateId,
          );
        const cardClassName = [
          "rounded-xl",
          "border",
          "border-neutral-200",
          "bg-white",
          "p-4",
          "shadow-sm",
          accentClass,
          template.isMissing ? "border-dashed opacity-70" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const typeLabel = template.type === "missing"
          ? "Missing template"
          : this.formatTemplateType(template.type);
        const scopeLabel =
          template.isMissing || !template.scope
            ? null
            : template.scope === "global"
            ? "Global template"
            : template.scope === "shared"
            ? "Shared template"
            : "Course template";
        const metaLabel = [typeLabel, scopeLabel].filter(Boolean).join(" · ");

        const optionClass = (value: any): string =>
          [
            "flex",
            "items-center",
            "gap-2",
            "rounded-lg",
            "border",
            "px-3",
            "py-2",
            "text-sm",
            "font-medium",
            "transition",
            choice === value
              ? "border-primary-500 bg-primary-50 text-primary-700"
              : "border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-800",
          ]
            .filter(Boolean)
            .join(" ");

        const moduleOptions = moduleCount
          ? modules
            .map((module) => {
              const moduleNumber = module.moduleNumber ?? 1;
              const checked = moduleNumbers.includes(moduleNumber);
              const labelTitle = module.title
                ? this.escapeHtml(module.title)
                : `Module ${moduleNumber}`;
              return `<label class="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:border-neutral-300" data-template-module-option>
                 <input class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" type="checkbox" data-template-module="${moduleNumber}" ${checked ? "checked" : ""
                }>
                 <span>${labelTitle}</span>
               </label>`;
            })
            .join("")
          : '<p class="text-sm text-neutral-500" data-template-modules-empty>Generate curriculum modules to target placements.</p>';

        const moduleSelectionHint =
          showModules && moduleCount && moduleNumbers.length === 0
            ? '<p class="text-xs text-neutral-500" data-template-modules-hint>Select at least one module.</p>'
            : "";

        const lessonOptions = lessonCount
          ? lessons
            .map((lesson) => {
              const lessonNumber = lesson.lessonNumber ?? 0;
              if (!lessonNumber) {
                return "";
              }

              const checked = lessonNumbers.includes(lessonNumber);
              const moduleNumber = lesson.moduleNumber ?? undefined;
              const moduleLabelRaw = moduleNumber
                ? moduleTitleLookup.get(moduleNumber) || `Module ${moduleNumber}`
                : "";
              const lessonLabel = lesson.title && lesson.title.trim().length
                ? this.escapeHtml(lesson.title)
                : `Lesson ${lessonNumber}`;
              const moduleMeta = moduleLabelRaw
                ? `<span class="text-xs text-neutral-500" data-template-lesson-meta>${this.escapeHtml(
                  moduleLabelRaw,
                )}</span>`
                : "";

              return `<label class="flex items-start gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:border-neutral-300" data-template-lesson-option>
                  <input class="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" type="checkbox" data-template-lesson="${lessonNumber}" ${checked ? "checked" : ""
                }>
                  <span class="flex flex-col" data-template-lesson-content>
                    <span class="font-medium text-neutral-800" data-template-lesson-title>${lessonLabel}</span>
                    ${moduleMeta}
                  </span>
                </label>`;
            })
            .filter(Boolean)
            .join("")
          : '<p class="text-sm text-neutral-500" data-template-lessons-empty>Generate curriculum lessons to target placements.</p>';

        const lessonSelectionHint =
          showLessons && lessonCount && lessonNumbers.length === 0
            ? '<p class="text-xs text-neutral-500" data-template-lessons-hint>Select at least one lesson.</p>'
            : "";

        return `
        <article class="${cardClassName}" data-template-card data-template-id="${template.id}" data-template-type="${this.escapeHtml(
          template.type ?? "",
        )}">
           <header class="flex items-start justify-between gap-3" data-template-card-header>
             <div class="flex-1" data-template-card-header-content>
               <h4 class="text-base font-semibold text-neutral-900">
                 ${this.escapeHtml(template.name)}
                 ${choice === "all-lessons" && isLessonTemplate ? '<span class="text-xs font-medium text-neutral-400" data-template-main-tag>(main)</span>' : ''}
               </h4>
               <p class="text-xs text-neutral-500" data-template-card-meta>${this.escapeHtml(
          metaLabel || typeLabel || "",
        )}</p>
             </div>
             <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50" aria-label="Toggle template details" aria-expanded="false" data-template-toggle>
               <span class="inline-flex h-4 w-4">
                 <svg class="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                 </svg>
               </span>
             </button>
           </header>
             ${template.description
            ? `<p class="hidden text-sm text-neutral-600" data-template-card-description>${this.escapeHtml(
              template.description,
            )}</p>`
            : ""
          }
             ${template.isMissing
            ? '<p class="hidden text-sm text-red-600" data-template-card-warning>Template not available. Remove or update placement.</p>'
            : ""
          }
           <div class="hidden mt-4 space-y-3" data-template-card-options>
             <label class="${optionClass("none")}">
               <input type="radio" name="placement-${template.id}" value="none"${choice === "none" ? " checked" : ""
          }>
               <span>No automatic placement</span>
             </label>
             ${isLessonTemplate ? `
             <label class="${optionClass("all-lessons")}">
               <input type="radio" name="placement-${template.id}" value="all-lessons"${choice === "all-lessons" ? " checked" : ""
            } ${lessonCount > 0 ? "" : "disabled"}>
               <span>Apply to all lessons</span>
             </label>
             <label class="${optionClass("lesson-ranges")}">
               <input type="radio" name="placement-${template.id}" value="lesson-ranges"${choice === "lesson-ranges" ? " checked" : ""
            } ${lessonCount > 0 ? "" : "disabled"}>
               <span>Apply to specific lesson ranges</span>
             </label>
             <div class="mt-3" data-template-card-lesson-ranges${showLessonRanges ? "" : " hidden"
            }>
               ${this.renderLessonRanges(template.id, lessonRanges, lessonCount)}
             </div>
             ` : ""}
             ${!isLessonTemplate ? `
             <label class="${optionClass("end-of-each-module")}">
               <input type="radio" name="placement-${template.id}" value="end-of-each-module"${choice === "end-of-each-module" ? " checked" : ""
            } ${moduleCount > 0 ? "" : "disabled"}>
               <span>End of each module</span>
             </label>
             <label class="${optionClass("specific-modules")}">
               <input type="radio" name="placement-${template.id}" value="specific-modules"${choice === "specific-modules" ? " checked" : ""
            } ${moduleCount > 0 ? "" : "disabled"}>
               <span>Specific modules</span>
             </label>
             <div class="mt-3 space-y-2" data-template-card-modules${showModules ? "" : " hidden"
            }>
               ${moduleOptions}
               ${moduleSelectionHint}
             </div>
             <label class="${optionClass("specific-lessons")}">
               <input type="radio" name="placement-${template.id}" value="specific-lessons"${choice === "specific-lessons" ? " checked" : ""
            } ${lessonCount > 0 ? "" : "disabled"}>
               <span>Specific lessons</span>
             </label>
             <div class="mt-3 space-y-2" data-template-card-lessons${showLessons ? "" : " hidden"
            }>
               ${lessonOptions}
               ${lessonSelectionHint}
             </div>
             <label class="${optionClass("end-of-course")}">
               <input type="radio" name="placement-${template.id}" value="end-of-course"${choice === "end-of-course" ? " checked" : ""
            }>
               <span>End of course</span>
             </label>
             ` : ""}
           </div>
         </article>
       `;
      })
      .join("");

    this.templatePlacementList.innerHTML = html;
  }

  private renderLessonRanges(
    templateId: string,
    ranges: any[],
    maxLesson: number,
  ): string {
    if (!ranges.length) {
      ranges = [{ start: 1, end: maxLesson || 1 }];
    }

    const rangesHTML = ranges
      .map(
        (range, index) => `
     <div class="flex flex-wrap items-end gap-3" data-range-index="${index}" data-lesson-range>
       <div class="flex flex-wrap gap-3" data-lesson-range-inputs>
         <div class="flex flex-col gap-2" data-lesson-range-input>
           <label class="text-xs font-medium text-neutral-600" for="range-start-${templateId}-${index}">Start lesson</label>
           <input
             type="number"
             id="range-start-${templateId}-${index}"
             min="1"
             max="${maxLesson}"
             value="${range.start}"
             data-range-start
             data-range-index="${index}"
             class="w-24 rounded-md border-0 py-1.5 text-xs text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600"
           >
         </div>
         <div class="flex flex-col gap-2" data-lesson-range-input>
           <label class="text-xs font-medium text-neutral-600" for="range-end-${templateId}-${index}">End lesson</label>
           <input
             type="number"
             id="range-end-${templateId}-${index}"
             min="1"
             max="${maxLesson}"
             value="${range.end}"
             data-range-end
             data-range-index="${index}"
             class="w-24 rounded-md border-0 py-1.5 text-xs text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600"
           >
         </div>
       </div>
       ${ranges.length > 1
            ? `<button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50" data-range-remove="${index}" aria-label="Remove range">
           <svg class="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
             <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
           </svg>
         </button>`
            : ""
          }
     </div>
   `,
      )
      .join("");

    return `
     ${rangesHTML}
     <button type="button" class="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50" data-range-add>
       <svg class="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
         <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
       </svg>
       <span>Add another range</span>
     </button>
     ${!ranges.length || ranges.length === 0 ? '<p class="text-xs text-neutral-500" data-lesson-range-hint>Add at least one lesson range.</p>' : ""}
   `;
  }

  private getModulesForPlacement(): CurriculumModule[] {
    if (this.currentModules.length) {
      return this.currentModules;
    }

    if (!this.currentCurriculum.length) {
      return [];
    }

    this.currentCurriculum.forEach((lesson) => {
      lesson.moduleNumber = lesson.moduleNumber ?? 1;
    });

    return [
      {
        moduleNumber: 1,
        title: "Module 1",
        lessons: this.currentCurriculum,
      },
    ];
  }

  private getTemplatePlacement(
    templateId: string,
  ): TemplatePlacementConfig | undefined {
    const directMatch = this.templatePlacements.find(
      (placement) => placement.templateId === templateId,
    );
    if (directMatch) {
      return directMatch;
    }

    const summary = this.availableTemplates.find(
      (template) => template.id === templateId,
    );
    const slugCandidates = new Set<string>();
    if (summary?.templateId) {
      slugCandidates.add(summary.templateId);
    }
    slugCandidates.add(templateId);

    return this.templatePlacements.find((placement) => {
      const matchesId =
        placement.templateId && slugCandidates.has(placement.templateId);
      const matchesSlug =
        placement.templateSlug && slugCandidates.has(placement.templateSlug);
      return Boolean(matchesId || matchesSlug);
    });
  }

  private getFilteredTemplatesForCourseType(): TemplateSummary[] {
    const allTemplates = this.getTemplatesForPlacementUI();

    if (this.courseType === "custom") {
      return allTemplates;
    }

    const allowedTypes = this.getAllowedTemplateTypesForCourse();
    if (!allowedTypes) {
      return allTemplates;
    }

    return allTemplates.filter(template => {
      if (template.isMissing) {
        return true;
      }

      // Normalize the template type
      const normalizedType = this.normalizeTemplateTypeName(template.type);
      
      // If normalization succeeds, check if it matches allowed types
      if (normalizedType && allowedTypes.includes(normalizedType)) {
        return true;
      }
      
      // Fallback: if normalization fails or doesn't match, try raw type (case-insensitive)
      // This handles edge cases where normalization might not work as expected
      if (typeof template.type === "string") {
        const rawTypeLower = template.type.trim().toLowerCase();
        if (rawTypeLower && allowedTypes.includes(rawTypeLower)) {
          return true;
        }
      }
      
      return false;
    });
  }

  private getTemplatesForPlacementUI(): TemplateSummary[] {
    const displayTemplates = [...this.availableTemplates];
    // Create sets for both database ID and template slug matching
    const existingIds = new Set(displayTemplates.map((template) => template.id));
    const existingTemplateIds = new Set(
      displayTemplates
        .map((template) => template.templateId)
        .filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        ),
    );

    this.templatePlacements.forEach((placement) => {
      // Check if template exists by database ID or by template slug
      const existsById = placement.templateId ? existingIds.has(placement.templateId) : false;
      const slugCandidates = [placement.templateSlug, placement.templateId].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      );
      const existsBySlug = slugCandidates.some((slug) => existingTemplateIds.has(slug));
      
      if (!existsById && !existsBySlug) {
        // Only mark as missing if it truly doesn't exist
        const fallbackId = placement.templateId || placement.templateSlug || `missing-${slugCandidates[0] || "template"}`;
        displayTemplates.push({
          id: fallbackId,
          templateId: slugCandidates[0] || fallbackId,
          name: `${placement.templateName || slugCandidates[0] || "Template"} (missing)`,
          type: "missing",
          description: null,
          isMissing: true,
        });
        existingIds.add(fallbackId);
        if (slugCandidates[0]) {
          existingTemplateIds.add(slugCandidates[0]);
        }
      }
    });

    return displayTemplates;
  }

  private getAllowedTemplateTypesForCourse(): string[] | null {
    const mapping: Record<
      NonNullable<typeof this.courseType>,
      string[] | null
    > = {
      minimalist: ["lesson", "quiz"],
      essential: ["lesson", "quiz", "feedback", "assessment", "certificate"],
      complete: [
        "lesson",
        "quiz",
        "feedback",
        "assessment",
        "report",
        "review",
        "project",
        "module_orientation",
        "course_orientation",
        "certificate",
      ],
      custom: null,
    };

    return mapping[this.courseType] || null;
  }

  private normalizeTemplateTypeName(type: string | null | undefined): string | null {
    if (!type || typeof type !== "string") {
      return null;
    }

    const normalized = type
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (!normalized) {
      return null;
    }

    const simplified = normalized.replace(/(?:_)?(template|plan|layout)$/, "");
    const cleaned = simplified
      .replace(/__+/g, "_")
      .replace(/^_+|_+$/g, "");

    return cleaned || normalized;
  }

  private lookupTemplateSummary(
    templateId: string | null | undefined,
  ): TemplateSummary | undefined {
    if (!templateId) {
      return undefined;
    }

    return this.availableTemplates.find((template) => template.id === templateId);
  }

  private formatTemplateType(type: string | null | undefined): string {
    if (!type || typeof type !== "string") {
      return "Template";
    }

    const normalized = type.trim().toLowerCase();
    if (!normalized.length) {
      return "Template";
    }

    if (Object.prototype.hasOwnProperty.call(TEMPLATE_TYPE_LABELS, normalized)) {
      return TEMPLATE_TYPE_LABELS[
        normalized as keyof typeof TEMPLATE_TYPE_LABELS
      ];
    }

    const humanized = normalized
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    return humanized || "Template";
  }

  private resolveTemplateAccentClass(
    templateType: string | null | undefined,
    templateIdentifier?: string | null | undefined,
  ): string {
    if (!this.templateAccentPalette.length) {
      return "";
    }

    if (typeof templateType === "string" && templateType.trim().length > 0) {
      const normalizedType = templateType.trim().toLowerCase();
      const mappedClass = this.templateAccentByType[normalizedType];
      if (mappedClass) {
        return mappedClass;
      }
    }

    const fallbackKey =
      (typeof templateIdentifier === "string" && templateIdentifier.trim().length > 0
        ? templateIdentifier.trim()
        : templateType && templateType.trim().length > 0
        ? templateType.trim()
        : "") || "";

    if (!fallbackKey) {
      return this.templateAccentPalette[0];
    }

    let hash = 0;

    for (const char of fallbackKey) {
      hash = (hash + char.charCodeAt(0)) % this.templateAccentPalette.length;
    }

    return this.templateAccentPalette[hash];
  }

  private renderTemplateBlock(
    placement: TemplatePlacementConfig,
    context: "module" | "course" | "lesson",
    module?: CurriculumModule,
    lesson?: CurriculumLesson,
  ): string {
    const summary = this.lookupTemplateSummary(placement.templateId);
    const isMissing = !summary;
    const accentClass = isMissing
      ? ""
      : this.resolveTemplateAccentClass(
        summary?.type,
        summary?.id || placement.templateId || placement.templateSlug,
      );

    const moduleLabel = module
      ? module.title && module.title.trim().length
        ? module.title
        : `Module ${module.moduleNumber}`
      : "";

    const lessonLabel = lesson
      ? lesson.title && lesson.title.trim().length
        ? lesson.title
        : `Lesson ${lesson.lessonNumber}`
      : "";

    let contextLabel: string;
    if (context === "course") {
      contextLabel = "End of course";
    } else if (context === "lesson") {
      const baseLabel = lessonLabel ? `After ${lessonLabel}` : "Lesson placement";
      contextLabel = moduleLabel ? `${baseLabel} • ${moduleLabel}` : baseLabel;
    } else {
      contextLabel = moduleLabel ? `After ${moduleLabel}` : "Module placement";
    }

    const slug = placement.templateSlug || placement.templateId;
    const classNames = [
      "rounded-lg",
      "border",
      "px-3",
      "py-2",
      "text-xs",
      "font-medium",
      accentClass || "border-neutral-200 bg-neutral-50 text-neutral-600",
      isMissing ? "border-dashed text-red-600" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const typeLabel = isMissing
      ? "Missing template"
      : this.formatTemplateType(summary?.type);

    return `
    <div class="${classNames}" data-template-block="${placement.templateId}" data-template-type="${this.escapeHtml(
      typeLabel,
    )}" data-template-context="${context}">
       <div class="flex flex-col gap-1" data-template-block-content>
         <span class="text-sm font-semibold">${this.escapeHtml(
      placement.templateName,
    )}</span>
         <span class="text-xs text-neutral-500">${this.escapeHtml(contextLabel)}</span>
        <span class="text-[10px] uppercase tracking-wide text-neutral-400">${this.escapeHtml(slug)}</span>
       </div>
     </div>
   `;
  }

  public highlightPreviewModeButton(mode: PreviewMode): void {
    const previewModeButtons =
      this.curriculumPreviewSection?.querySelectorAll<HTMLButtonElement>(
        'button[data-mode]',
      );

    previewModeButtons?.forEach((btn) => {
      const buttonMode = btn.dataset.mode as PreviewMode | undefined;
      setButtonActive(btn, buttonMode === mode);
    });
  }

  public showPreview(): void {
    this.curriculumPreviewSection.style.display = 'flex';
    this.renderCurriculumPreview();
  }

  public hidePreview(): void {
    this.curriculumPreviewSection.style.display = 'none';
  }

  private escapeHtml(value: string): string {
    if (!value) {
      return "";
    }

    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return value.replace(/[&<>"']/g, (char) => replacements[char] || char);
  }

  private getTemplatePlacementsForModule(
    moduleNumber: number,
  ): TemplatePlacementConfig[] {
    return this.templatePlacements.filter((placement) => {
      if (placement.placementType === "end-of-each-module") {
        return true;
      }
      if (placement.placementType === "specific-modules") {
        return (placement.moduleNumbers ?? []).includes(moduleNumber);
      }
      return false;
    });
  }

  private getTemplatePlacementsForCourseEnd(): TemplatePlacementConfig[] {
    return this.templatePlacements.filter(
      (placement) => placement.placementType === "end-of-course",
    );
  }

  private organizeLessonsIntoModules(lessons: CurriculumLesson[]): CurriculumModule[] {
    if (this.moduleOrganization === "linear") {
      if (!lessons.length) {
        return [];
      }

      lessons.forEach((lesson) => {
        lesson.moduleNumber = 1;
      });

      return [
        {
          moduleNumber: 1,
          title: "Module 1",
          lessons: lessons,
        },
      ];
    }
    return [];
  }
}
