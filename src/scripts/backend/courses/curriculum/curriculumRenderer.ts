import {
  CurriculumLesson,
  CurriculumModule,
  TemplatePlacementConfig,
  TemplateSummary,
  ModuleOrganizationType,
  CurriculumTopic,
} from "./curriculumManager.js";
import { TEMPLATE_TYPE_LABELS } from "../templates/templateOptions.js";

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
    private readonly templateAccentPalette: string[] = [
    "template-accent--sky",
    "template-accent--violet",
    "template-accent--amber",
    "template-accent--teal",
    "template-accent--rose",
    "template-accent--slate",
    "template-accent--cobalt",
    "template-accent--mint",
    "template-accent--sunset",
    "template-accent--gold",
  ];
  private readonly templateAccentByType: Record<string, string> = {
    assessment: "template-accent--teal",
    quiz: "template-accent--violet",
    exam: "template-accent--rose",
    lesson: "template-accent--sky",
    certificate: "template-accent--gold",
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
  }) {
    this.currentCurriculum = data.currentCurriculum;
    this.currentModules = data.currentModules;
    this.currentPreviewMode = data.currentPreviewMode;
    this.scheduledLessonDuration = data.scheduledLessonDuration;
    this.availableTemplates = data.availableTemplates;
    this.templatePlacements = data.templatePlacements;
    this.courseType = data.courseType;
    this.moduleOrganization = data.moduleOrganization;
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
      ".article__preview-placeholder",
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

    previewContainer.innerHTML = '<div class="loading-state text--secondary">Loading curriculum...</div>';

    let html = "";

    if (this.currentCurriculum.length === 0) {
      html = `
       <div class="empty-state">
         <div class="empty-state__icon"></div>
         <div class="empty-state__title heading heading--medium text--secondary">No Curriculum Generated Yet</div>
         <div class="empty-state__message text--small text--tertiary">
           Configure your lesson settings and generate a curriculum to see the preview.
         </div>
       </div>`;
    } else if (this.currentPreviewMode === "modules") {
      if (modulesForPreview.length === 0) {
        html = `
         <div class="empty-state">
           <div class="empty-state__title heading heading--medium text--secondary">Linear Organization</div>
           <div class="empty-state__message text--small text--tertiary">
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
          <div class="module">
            <div class="module__header">
              <div class="module__title-block">
                <span class="module__chip" aria-hidden="true">Module ${moduleNumber}</span>
                <h2
                  class="module__title"
                  contenteditable="true"
                  data-module="${moduleNumber}"
                  data-field="title"
                  data-placeholder="Click to add module title...">
                  ${moduleTitle}
                </h2>
              </div>
              <div class="module__meta">
                <span class="module__meta-item">${module.lessons.length} lessons</span>
              </div>
            </div>
            <div class="module__body">
              <div class="module__lessons">`;

          module.lessons.forEach((lesson) => {
            const lessonHeader = this.renderLessonHeader(lesson, {
              titleEditable: true,
              placeholder: "Click to add lesson title...",
            });

            html += `
                <div class="lesson lesson--in-module">
                  ${lessonHeader}
                </div>`;
          });

          html += `
              </div>`;

          const modulePlacements = this.getTemplatePlacementsForModule(moduleNumber);
          if (modulePlacements.length) {
            html += `<div class="module__templates">`;
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
          if (this.scheduledLessonDuration) {
            metaItems.push(
              `<span class="lesson__meta-item lesson__meta-item--duration">${this.scheduledLessonDuration} minutes</span>`,
            );
          }
          metaItems.push(
            `<span class="lesson__meta-item lesson__meta-item--topics">${lesson.topics.length} topics</span>`,
          );
          const metaHtml = metaItems.length
            ? `<div class="lesson__meta">${metaItems.join("")}</div>`
            : "";

          html += `
           <div class="lesson">
             ${lessonHeader}
             ${metaHtml}`;

          lesson.topics.forEach((topic, topicIndex) => {
            html += `
             <div class="topic">
               <h4 class="topic__title" contenteditable="true"
                    data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title"
                    data-placeholder="Click to add topic title...">
                 ${topic.title || `Topic ${topicIndex + 1}`}
               </h4>

               <div class="topic__objectives">`;

            topic.objectives.forEach((objective, objIndex) => {
              html += `
                 <div class="objective-group">
                   <div class="objective-title">
                     <span class="objective-text" contenteditable="true"
                           data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-objective="${objIndex}"
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
                   <div class="objective-tasks">
                     <ul class="tasks__list">`;

                  for (let taskIdx = startTaskIndex; taskIdx < endTaskIndex; taskIdx++) {
                    if (topic.tasks[taskIdx] !== undefined) {
                      html += `
                         <li class="task-item task-item--editable" contenteditable="true"
                             data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-task="${taskIdx}"
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
           <div class="lesson lesson--simple">
             ${lessonHeader}
           </div>`;

        } else if (this.currentPreviewMode === "competencies") {
          const competencies = this.getLessonCompetenciesForPreview(lesson);
          let topicCounter = 0;
          html += `
           <div class="lesson lesson--medium">
             ${lessonHeader}`;

          if (!competencies.length) {
            html += `
             <p class="text--tertiary">No competencies defined yet. Add topics to build your competency structure.</p>`;
          }

          competencies.forEach((competency, competencyIndex) => {
            const competencyTitle =
              competency.title && competency.title.trim().length
                ? competency.title.trim()
                : `Competency ${competencyIndex + 1}`;

            html += `
             <div class="topic topic--competency">
               <h4 class="topic__title competency__title" contenteditable="true"
                    data-lesson="${lesson.lessonNumber}" data-competency="${competencyIndex}"
                    data-field="competency-title"
                    data-placeholder="Click to add competency title...">
                 ${this.escapeHtml(competencyTitle)}
               </h4>`;

            if (competency.topics.length) {
              html += `<ul class="competency__topics">`;
              competency.topics.forEach((topic) => {
                const topicTitle =
                  topic.title && topic.title.trim().length
                    ? topic.title.trim()
                    : `Topic ${topicCounter + 1}`;

                html += `
                 <li class="competency__topic">
                   <span class="topic__title" contenteditable="true"
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
              html += `<p class="text--tertiary competency__topics-empty">No topics assigned yet.</p>`;
            }

            html += `</div>`;
          });

          html += `</div>`;

        } else if (this.currentPreviewMode === "topics") {
          html += `
           <div class="lesson lesson--medium">
             ${lessonHeader}`;

          lesson.topics.forEach((topic, topicIndex) => {
            html += `
             <div class="topic topic--simple">
               <h4 class="topic__title" contenteditable="true"
                    data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title"
                    data-placeholder="Click to add topic title...">
                 ${topic.title || `Topic ${topicIndex + 1}`}
               </h4>
             </div>`;
          });

          html += `</div>`;

        } else if (this.currentPreviewMode === "objectives") {
          html += `
           <div class="lesson lesson--detailed">
             ${lessonHeader}`;

          lesson.topics.forEach((topic, topicIndex) => {
            html += `
             <div class="topic">
               <h4 class="topic__title" contenteditable="false"
                    data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title">
                 ${topic.title || `Topic ${topicIndex + 1}`}
               </h4>

               <div class="topic__objectives">`;

            topic.objectives.forEach((objective, objIndex) => {
              html += `
                 <div class="objective-group">
                   <div class="objective-title">
                     <span class="objective-text" contenteditable="true"
                           data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-objective="${objIndex}"
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
           <div class="lesson lesson--full">
             ${lessonHeader}`;

          lesson.topics.forEach((topic, topicIndex) => {
            html += `
             <div class="topic">
               <h4 class="topic__title" contenteditable="false"
                    data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title">
                 ${topic.title || `Topic ${topicIndex + 1}`}
               </h4>

               <div class="topic__objectives">`;

            topic.objectives.forEach((objective, objIndex) => {
              html += `
                 <div class="objective-group">
                   <div class="objective-title">
                     <span class="objective-text" contenteditable="false"
                           data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-objective="${objIndex}">
                       ${objective || `Objective ${objIndex + 1}`}
                     </span>
                   </div>`;

              if (topic.tasks && topic.tasks.length > 0 && topic.objectives.length > 0) {
                const tasksPerObjective = 2;
                const startTaskIndex = objIndex * tasksPerObjective;
                const endTaskIndex = Math.min(startTaskIndex + tasksPerObjective, topic.tasks.length);

                html += `
                   <div class="objective-tasks objective-tasks--detailed">
                     <ul class="tasks__list tasks__list--detailed">`;

                for (let taskIdx = startTaskIndex; taskIdx < endTaskIndex; taskIdx++) {
                  if (topic.tasks[taskIdx] !== undefined) {
                    html += `
                         <li class="task-item task-item--editable" contenteditable="true"
                             data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-task="${taskIdx}"
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

    return `
      <div class="lesson__header">
        <div class="lesson__title-block">
          <span class="lesson__chip" aria-hidden="true">Lesson ${lessonNumber}</span>
          <h3
            class="lesson__title"
            contenteditable="${titleEditable ? "true" : "false"}"
            data-lesson="${lessonNumber}"
            data-field="title"${placeholderAttr}>
            ${rawTitle}
          </h3>
        </div>
        ${templateControls}
      </div>
    `;
  }

  private getLessonCompetenciesForPreview(
    lesson: CurriculumLesson,
  ): Array<{ title: string; topics: CurriculumTopic[] }> {
    const competencySource = (lesson as unknown as { competencies?: Array<{ title?: string; topics?: CurriculumTopic[] }> })
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
      ? `<span class="lesson__template-badge ${accentClass}">${this.escapeHtml(
        this.formatTemplateType(currentTemplate.type),
      )}</span>`
      : "";

    const selectId = `lesson-template-${lesson.lessonNumber}`;

    return `
     <div class="lesson__template-selector">
       <label class="lesson__template-label" for="${selectId}">
         <span class="lesson__template-label-text">Template</span>
       </label>
       <div class="lesson__template-controls">
         <select
           id="${selectId}"
           class="lesson__template-dropdown input input--select"
           data-lesson-number="${lesson.lessonNumber}">
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
      const courseTypeLabel = this.courseType === "custom"
        ? "Create a template to unlock placement options."
        : `No templates available for ${this.courseType} course type. Switch to "Custom" to access all templates.`;
      this.templatePlacementList.innerHTML =
        `<p class="template-placement__empty">${courseTypeLabel}</p>`;
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
          "template-placement-card",
          accentClass,
          template.isMissing ? "template-placement-card--missing" : "",
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
            : "Course template";
        const metaLabel = [typeLabel, scopeLabel].filter(Boolean).join(" · ");

        const optionClass = (value: any): string =>
          [
            "template-placement-card__option",
            choice === value ? "template-placement-card__option--active" : "",
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
              return `<label class="template-placement-card__module">
                 <input type="checkbox" data-template-module="${moduleNumber}" ${checked ? "checked" : ""
                }>
                 <span>${labelTitle}</span>
               </label>`;
            })
            .join("")
          : '<p class="template-placement-card__modules-empty">Generate curriculum modules to target placements.</p>';

        const moduleSelectionHint =
          showModules && moduleCount && moduleNumbers.length === 0
            ? '<p class="template-placement-card__modules-hint">Select at least one module.</p>'
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
                ? `<span class="template-placement-card__lesson-meta">${this.escapeHtml(
                  moduleLabelRaw,
                )}</span>`
                : "";

              return `<label class="template-placement-card__lesson">
                  <input type="checkbox" data-template-lesson="${lessonNumber}" ${checked ? "checked" : ""
                }>
                  <span class="template-placement-card__lesson-content">
                    <span class="template-placement-card__lesson-title">${lessonLabel}</span>
                    ${moduleMeta}
                  </span>
                </label>`;
            })
            .filter(Boolean)
            .join("")
          : '<p class="template-placement-card__lessons-empty">Generate curriculum lessons to target placements.</p>';

        const lessonSelectionHint =
          showLessons && lessonCount && lessonNumbers.length === 0
            ? '<p class="template-placement-card__lessons-hint">Select at least one lesson.</p>'
            : "";

        return `
        <article class="${cardClassName} template-placement-card--collapsed" data-template-card data-template-id="${template.id}" data-template-type="${this.escapeHtml(
          template.type ?? "",
        )}">
           <header class="template-placement-card__header">
             <div class="template-placement-card__header-content">
               <h4 class="template-placement-card__title">
                 ${this.escapeHtml(template.name)}
                 ${choice === "all-lessons" && isLessonTemplate ? '<span class="template-placement-card__main-tag">(main)</span>' : ''}
               </h4>
               <p class="template-placement-card__meta">${this.escapeHtml(
          metaLabel || typeLabel || "",
        )}</p>
             </div>
             <button type="button" class="template-placement-card__toggle" aria-label="Toggle template details" aria-expanded="false" data-template-toggle>
               <span class="template-placement-card__toggle-icon">
                 <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                 </svg>
               </span>
             </button>
           </header>
             ${template.description
            ? `<p class="template-placement-card__description">${this.escapeHtml(
              template.description,
            )}</p>`
            : ""
          }
             ${template.isMissing
            ? '<p class="template-placement-card__warning">Template not available. Remove or update placement.</p>'
            : ""
          }
           <div class="template-placement-card__options">
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
             <div class="template-placement-card__lesson-ranges"${showLessonRanges ? "" : " hidden"
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
             <div class="template-placement-card__modules"${showModules ? "" : " hidden"
            }>
               ${moduleOptions}
               ${moduleSelectionHint}
             </div>
             <label class="${optionClass("specific-lessons")}">
               <input type="radio" name="placement-${template.id}" value="specific-lessons"${choice === "specific-lessons" ? " checked" : ""
            } ${lessonCount > 0 ? "" : "disabled"}>
               <span>Specific lessons</span>
             </label>
             <div class="template-placement-card__lessons"${showLessons ? "" : " hidden"
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
     <div class="template-placement-card__lesson-range" data-range-index="${index}">
       <div class="template-placement-card__lesson-range-inputs">
         <div class="template-placement-card__lesson-range-input">
           <label for="range-start-${templateId}-${index}">Start lesson</label>
           <input
             type="number"
             id="range-start-${templateId}-${index}"
             min="1"
             max="${maxLesson}"
             value="${range.start}"
             data-range-start
             data-range-index="${index}"
           >
         </div>
         <div class="template-placement-card__lesson-range-input">
           <label for="range-end-${templateId}-${index}">End lesson</label>
           <input
             type="number"
             id="range-end-${templateId}-${index}"
             min="1"
             max="${maxLesson}"
             value="${range.end}"
             data-range-end
             data-range-index="${index}"
           >
         </div>
       </div>
       ${ranges.length > 1
            ? `<button type="button" class="template-placement-card__lesson-range-remove" data-range-remove="${index}" aria-label="Remove range">
           <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
     <button type="button" class="template-placement-card__lesson-range-add" data-range-add>
       <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
         <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
       </svg>
       <span>Add another range</span>
     </button>
     ${!ranges.length || ranges.length === 0 ? '<p class="template-placement-card__lesson-ranges-hint">Add at least one lesson range.</p>' : ""}
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
    // Try exact match first (by database ID)
    let placement = this.templatePlacements.find((placement) => placement.templateId === templateId);
    
    // If not found, try matching by template slug (for backwards compatibility)
    if (!placement) {
      placement = this.templatePlacements.find((placement) => placement.templateSlug === templateId);
    }
    
    return placement;
  }

  private getFilteredTemplatesForCourseType(): TemplateSummary[] {
    const allTemplates = this.getTemplatesForPlacementUI();

    if (this.courseType === "custom") {
      return allTemplates;
    }

    const allowedTypes = {
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
    }[this.courseType];

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
    const existingTemplateIds = new Set(displayTemplates.map((template) => template.templateId));

    this.templatePlacements.forEach((placement) => {
      // Check if template exists by database ID or by template slug
      const existsById = existingIds.has(placement.templateId);
      const existsBySlug = existingTemplateIds.has(placement.templateSlug);
      
      if (!existsById && !existsBySlug) {
        // Only mark as missing if it truly doesn't exist
        displayTemplates.push({
          id: placement.templateId,
          templateId: placement.templateSlug,
          name: `${placement.templateName || placement.templateSlug} (missing)`,
          type: "missing",
          description: null,
          isMissing: true,
        });
        existingIds.add(placement.templateId);
      }
    });

    return displayTemplates;
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
      "template-block",
      `template-block--${context}`,
      accentClass,
      isMissing ? "template-block--missing" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const typeLabel = isMissing
      ? "Missing template"
      : this.formatTemplateType(summary?.type);

    return `
    <div class="${classNames}" data-template-block="${placement.templateId}" data-template-type="${this.escapeHtml(
      typeLabel,
    )}">
       <div class="template-block__content">
         <span class="template-block__name">${this.escapeHtml(
      placement.templateName,
    )}</span>
         <span class="template-block__context">${this.escapeHtml(contextLabel)}</span>
        <span class="template-block__slug">${this.escapeHtml(slug)}</span>
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

      btn.classList.remove("button--primary");
      btn.classList.remove("button--active");
      btn.classList.add("button--outline");

      if (buttonMode === mode) {
        btn.classList.remove("button--outline");
        btn.classList.add("button--primary");
      }
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

