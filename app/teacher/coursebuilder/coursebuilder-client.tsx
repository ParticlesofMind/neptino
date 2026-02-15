"use client";

import * as React from "react";
import { useCourseId } from "./hooks/use-course-id";
import { usePanelToggle } from "./hooks/use-panel-toggle";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useCanvasScrollNav } from "./hooks/use-canvas-scroll-nav";

const topSections = [
  { key: "setup", label: "Setup" },
  { key: "create", label: "Create" },
  { key: "preview", label: "Preview" },
  { key: "launch", label: "Launch" },
] as const;

type TopSection = (typeof topSections)[number]["key"];

type SetupSection =
  | "essentials"
  | "classification"
  | "students"
  | "pedagogy"
  | "templates"
  | "schedule"
  | "curriculum"
  | "generation"
  | "course-visibility"
  | "marketplace"
  | "pricing-monetization"
  | "external-integrations"
  | "communication"
  | "page-setup"
  | "interface"
  | "themes"
  | "accessibility-comfort"
  | "notifications-alerts"
  | "data-management"
  | "advanced-settings";

const setupNavGroups: { title: string; items: { key: SetupSection; label: string }[] }[] = [
  {
    title: "Setup",
    items: [
      { key: "essentials", label: "Essentials" },
      { key: "classification", label: "Classification" },
      { key: "students", label: "Students" },
      { key: "pedagogy", label: "Pedagogy" },
      { key: "templates", label: "Templates" },
      { key: "schedule", label: "Schedule" },
      { key: "curriculum", label: "Curriculum" },
      { key: "generation", label: "Generation" },
    ],
  },
  {
    title: "Publishing",
    items: [
      { key: "course-visibility", label: "Course visibility" },
      { key: "marketplace", label: "Marketplace" },
      { key: "pricing-monetization", label: "Pricing & Monetization" },
      { key: "external-integrations", label: "External Integrations & APIs" },
      { key: "communication", label: "Communication" },
    ],
  },
  {
    title: "Engine",
    items: [
      { key: "page-setup", label: "Page setup" },
      { key: "interface", label: "Interface" },
      { key: "themes", label: "Themes" },
      { key: "accessibility-comfort", label: "Accessibility & Comfort" },
    ],
  },
  {
    title: "Settings",
    items: [
      { key: "notifications-alerts", label: "Notifications & Alerts" },
      { key: "data-management", label: "Data management" },
      { key: "advanced-settings", label: "Advanced Settings" },
    ],
  },
];

const statusLabels: Record<SetupSection, string> = {
  essentials: "No data submitted yet",
  classification: "Classification pending",
  students: "Student cohorts not set",
  pedagogy: "Learning strategy drafts",
  templates: "Template library empty",
  schedule: "Schedule not configured",
  curriculum: "Curriculum outline needed",
  generation: "AI generation disabled",
  "course-visibility": "Private",
  marketplace: "Marketplace disabled",
  "pricing-monetization": "Pricing not configured",
  "external-integrations": "No integrations connected",
  communication: "Message templates empty",
  "page-setup": "Canvas defaults loaded",
  interface: "Default interface layout",
  themes: "Standard theme",
  "accessibility-comfort": "Accessibility settings default",
  "notifications-alerts": "Alerts enabled",
  "data-management": "Last backup: never",
  "advanced-settings": "Danger zone",
};

export default function CourseBuilderClient() {
  const [activeSection, setActiveSection] = React.useState<TopSection>("setup");
  const [activeSetupSection, setActiveSetupSection] = React.useState<SetupSection>("essentials");
  const engineInitializedRef = React.useRef(false);

  // React hooks replacing vanilla TS modules
  const { courseId } = useCourseId();
  const { getPanelButtonProps, isPanelVisible } = usePanelToggle();
  useKeyboardShortcuts(activeSection === "create");
  const scrollNav = useCanvasScrollNav();
  const setupModulesInitializedRef = React.useRef({
    classification: false,
    pedagogy: false,
    schedule: false,
    templates: false,
  });
  const courseBuilderInitializedRef = React.useRef(false);
  const activeSectionIndex = topSections.findIndex((section) => section.key === activeSection);
  const canGoPrevious = activeSectionIndex > 0;
  const canGoNext = activeSectionIndex < topSections.length - 1;

  const handlePreviousSection = () => {
    if (!canGoPrevious) return;
    setActiveSection(topSections[activeSectionIndex - 1].key);
  };

  const handleNextSection = () => {
    if (!canGoNext) return;
    setActiveSection(topSections[activeSectionIndex + 1].key);
  };

  React.useEffect(() => {
    const initializeSetupHandlers = async () => {
      try {
        const [{ pageSetupHandler }, { CourseBuilder }, { ViewToggleHandler }] = await Promise.all([
          import("@/src/scripts/backend/courses/settings/pageSetupHandler"),
          import("@/src/scripts/backend/courses"),
          import("@/src/scripts/navigation/CourseBuilderNavigation"),
        ]);

        const resolvedCourseId = courseId || sessionStorage.getItem("currentCourseId");
        if (resolvedCourseId) {
          pageSetupHandler.setCourseId(resolvedCourseId);
        }

        if (typeof window !== "undefined" && !courseBuilderInitializedRef.current) {
          courseBuilderInitializedRef.current = true;
          if (!(window as any).courseBuilderInstance) {
            new CourseBuilder();
          }
        }

        new ViewToggleHandler();
      } catch (error) {
        console.error("Failed to initialize course setup handlers:", error);
      }
    };

    void initializeSetupHandlers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const event = new CustomEvent("coursebuilderSectionActivated", {
      detail: { sectionId: activeSetupSection },
    });
    window.dispatchEvent(event);
  }, [activeSetupSection]);

  React.useEffect(() => {
    if (activeSection !== "create" || engineInitializedRef.current) {
      return;
    }

    engineInitializedRef.current = true;

    const initializeEngine = async () => {
      try {
        await Promise.all([
          import("@/src/scripts/coursebuilder/canvas/canvasInit"),
          import("@/src/scripts/coursebuilder/canvas/ViewportControls"),
          import("@/src/scripts/coursebuilder/canvas/EngineController"),
          import("@/src/scripts/coursebuilder/tools/ToolSystem"),
          import("@/src/scripts/coursebuilder/tools/EngineResizer"),
          import("@/src/scripts/media/ui/MediaInterface"),
        ]);
      } catch (error) {
        console.error("Failed to initialize course builder engine:", error);
      }
    };

    void initializeEngine();
  }, [activeSection]);

  React.useEffect(() => {
    if (activeSection !== "setup") {
      return;
    }

    const initializeSetupModule = async () => {
      if (activeSetupSection === "classification" && !setupModulesInitializedRef.current.classification) {
        setupModulesInitializedRef.current.classification = true;
        await import("@/src/scripts/backend/courses/classification/classificationFormHandler");
      }

      if (activeSetupSection === "pedagogy" && !setupModulesInitializedRef.current.pedagogy) {
        setupModulesInitializedRef.current.pedagogy = true;
        await import("@/src/scripts/backend/courses/pedagogy/pedagogyHandler");
      }

      if (activeSetupSection === "schedule" && !setupModulesInitializedRef.current.schedule) {
        setupModulesInitializedRef.current.schedule = true;
        const { ScheduleCourseManager } = await import(
          "@/src/scripts/backend/courses/schedule/scheduleCourse"
        );
        new ScheduleCourseManager();
      }

      if (activeSetupSection === "templates" && !setupModulesInitializedRef.current.templates) {
        setupModulesInitializedRef.current.templates = true;
        await Promise.all([
          import("@/src/scripts/backend/courses/templates/createTemplate"),
          import("@/src/scripts/backend/courses/templates/templateConfigHandler"),
        ]);
      }
    };

    void initializeSetupModule();
  }, [activeSection, activeSetupSection]);

  const renderSetupSection = () => {
    if (activeSetupSection === "essentials") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <form className="space-y-6" id="course-essentials-form">
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Course title
                <input
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  id="course-name"
                  maxLength={50}
                  name="course_name"
                  placeholder="Enter course title"
                  required
                  type="text"
                />
                <div className="mt-2 text-xs text-neutral-500" id="title-counter">
                  <span id="title-counter-value">0 / 50</span>
                </div>
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Course subtitle (optional)
                <input
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  id="course-subtitle"
                  maxLength={75}
                  name="course_subtitle"
                  placeholder="Enter course subtitle"
                  type="text"
                />
                <div className="mt-2 text-xs text-neutral-500" id="subtitle-counter">
                  <span id="subtitle-counter-value">0 / 75</span>
                </div>
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Course Description
                <textarea
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  id="course-description"
                  maxLength={999}
                  name="course_description"
                  placeholder="Describe what students will learn"
                  required
                  rows={4}
                ></textarea>
                <div className="mt-2 text-xs text-neutral-500" id="description-counter">
                  <span id="description-counter-value">0 / 999</span>
                </div>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="teacher-id">
                  Teacher
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="teacher-id"
                    name="teacher_id"
                    required
                  >
                    <option value="">Select teacher...</option>
                  </select>
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="institution">
                  Institution
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="institution"
                    name="institution"
                    required
                  >
                    <option value="">Select institution...</option>
                  </select>
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="course-language">
                  Course Language
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="course-language"
                    name="course_language"
                    required
                  >
                    <option value="">Select language...</option>
                  </select>
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="course-type">
                  Course Type
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="course-type"
                    name="course_type"
                    required
                  >
                    <option value="">Select course type...</option>
                    <option value="In-person">In-person</option>
                    <option value="Online">Online</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">Course Image</label>
              <div className="image-upload" id="course-image-upload">
                <input
                  accept="image/*"
                  aria-label="Upload course image"
                  className="sr-only"
                  id="course-image"
                  name="course_image"
                  required
                  type="file"
                />
                <div
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 rounded cursor-pointer hover:border-neutral-400"
                  id="course-image-overlay"
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex flex-col items-center" id="course-image-empty">
                    <span className="text-sm font-medium text-neutral-700">Upload course image</span>
                  </div>
                  <div className="flex items-center gap-4" hidden id="course-image-details">
                    <div className="relative">
                      <img alt="Course preview" className="w-32 h-32 object-cover rounded" hidden id="preview-img" src={undefined} />
                      <button aria-label="Remove course image" className="btn btn-ghost" hidden id="remove-image" type="button">
                        <span aria-hidden="true">x</span>
                      </button>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-neutral-700">Change course image</span>
                      <span className="text-xs text-neutral-500" hidden id="course-image-filename"></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-neutral-100 rounded text-sm" hidden id="course-code-display">
                <span className="text-xs font-medium text-neutral-500 uppercase">Course ID</span>
                <span className="text-lg font-semibold text-neutral-900" id="course-id-value">
                  -
                </span>
                <button className="btn btn-ghost" disabled id="course-code-copy-btn" type="button">
                  Copy
                </button>
              </div>
            </form>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="essentials-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn btn-primary" form="course-essentials-form" id="save-essentials-btn" type="submit">
                  Create Course
                </button>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "classification") {
      return (
        <div className="space-y-6" data-course-section="classification">
          <form className="space-y-6" id="course-classification-form">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900">Preliminary</h3>
                <p className="text-sm text-neutral-500">Age group and educational framework</p>
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-medium leading-6 text-neutral-900" htmlFor="class-year-select">
                  <span>Class Year</span>
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="class-year-select"
                    name="class_year"
                    required
                  >
                    <option value="">Loading...</option>
                  </select>
                </label>
                <label
                  className="block text-sm font-medium leading-6 text-neutral-900"
                  htmlFor="curricular-framework-select"
                >
                  <span>Curricular Framework</span>
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="curricular-framework-select"
                    name="curricular_framework"
                    required
                  >
                    <option value="">Loading...</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900">Classification</h3>
                <p className="text-sm text-neutral-500">Subject matter hierarchy</p>
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-medium leading-6 text-neutral-900" htmlFor="domain-select">
                  <span>Domain</span>
                  <span className="truncate">Academic field</span>
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="domain-select"
                    name="domain"
                    required
                  >
                    <option value="">Loading...</option>
                  </select>
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900" htmlFor="subject-select">
                  <span>Subject</span>
                  <span className="truncate">Specific discipline</span>
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    disabled
                    id="subject-select"
                    name="subject"
                    required
                  >
                    <option value="">Select domain first...</option>
                  </select>
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900" htmlFor="topic-select">
                  <span>Topic</span>
                  <span className="truncate">Area of study</span>
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    disabled
                    id="topic-select"
                    name="topic"
                    required
                  >
                    <option value="">Select subject first...</option>
                  </select>
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900" htmlFor="subtopic-select">
                  <span>Subtopic</span>
                  <span className="truncate">Specific focus</span>
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    disabled
                    id="subtopic-select"
                    name="subtopic"
                  >
                    <option value="">Select topic first...</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900">Course Sequence</h3>
                <p className="text-sm text-neutral-500">Position within the learning pathway</p>
              </div>
              <div className="space-y-4">
                <label
                  className="block text-sm font-medium leading-6 text-neutral-900"
                  htmlFor="previous-course-select"
                >
                  <span>Previous Course</span>
                  <span className="truncate">Course that should come before this one</span>
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="previous-course-select"
                    name="previous_course"
                  >
                    <option value="">Loading courses...</option>
                  </select>
                </label>
                <label
                  className="block text-sm font-medium leading-6 text-neutral-900"
                  htmlFor="current-course-select"
                >
                  <span>Current Course</span>
                  <span className="truncate">Other courses at this level</span>
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="current-course-select"
                    name="current_course"
                  >
                    <option value="">Loading courses...</option>
                  </select>
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900" htmlFor="next-course-select">
                  <span>Next Course</span>
                  <span className="truncate">Course that should come after this one</span>
                  <select
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="next-course-select"
                    name="next_course"
                  >
                    <option value="">Loading courses...</option>
                  </select>
                </label>
              </div>
            </div>
          </form>

          <div
            aria-live="polite"
            className="flex items-center gap-2 text-sm"
            data-card-save-status=""
            data-status="empty"
          >
            <span aria-hidden="true" className="w-4 h-4"></span>
            <span className="truncate" data-status-text="">
              No data submitted yet
            </span>
          </div>
        </div>
      );
    }

    if (activeSetupSection === "students") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="flex flex-col flex-1 min-h-0 p-6">
            <div className="flex items-center gap-2 mb-4 lg:hidden" data-article-toggle="">
              <button className="btn btn-ghost" data-article-toggle-btn="" data-view="config" type="button">
                Config
              </button>
              <button className="btn btn-ghost" data-article-toggle-btn="" data-view="preview" type="button">
                Preview
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
              <section
                aria-labelledby="students-roster-title"
                className="flex flex-col bg-white border border-neutral-200 rounded-lg overflow-y-auto h-full p-6"
                data-article-panel="config"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    className="btn btn-primary"
                    data-modal-target="students-upload-modal"
                    data-students-trigger=""
                    id="students-upload-btn"
                    type="button"
                  >
                    Upload students
                  </button>
                  <label className="flex items-center gap-2 text-sm font-medium leading-6 text-neutral-900" htmlFor="students-manual-entry-toggle">
                    <input
                      className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                      id="students-manual-entry-toggle"
                      name="students-method"
                      type="radio"
                      value="manual-entry"
                    />
                    <span>Manual Entry</span>
                  </label>
                </div>
                <form className="space-y-6" id="students-form">
                  <div
                    aria-live="assertive"
                    className="text-sm text-red-600"
                    data-students-feedback=""
                    hidden
                    id="students-feedback"
                    role="alert"
                  ></div>
                </form>
              </section>
              <section
                aria-labelledby="students-preview-title"
                className="flex flex-col bg-neutral-50 border border-neutral-200 rounded-lg overflow-y-auto h-full relative p-6"
                data-article-panel="preview"
              >
                <div
                  aria-busy="false"
                  aria-describedby="students-preview-empty"
                  aria-live="polite"
                  className="flex flex-col gap-3"
                  data-students-list-wrapper=""
                  role="region"
                >
                  <div className="w-full" data-students-list="" id="students-preview-list">
                    <div className="grid grid-cols-4 gap-2 text-xs font-semibold uppercase text-neutral-500">
                      <div className="text-left">First name</div>
                      <div className="text-left">Last name</div>
                      <div className="text-left">Email</div>
                      <div className="text-left">Student ID</div>
                    </div>
                    <div className="mt-3 space-y-2" data-students-list-body="" id="students-preview-body">
                      <div className="text-sm text-neutral-500" data-students-preview-empty="" id="students-preview-empty">
                        No roster loaded yet. Upload or enter students to generate a preview.
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="students-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>

          <article
            aria-hidden="true"
            aria-labelledby="students-upload-title"
            aria-modal="true"
            className="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/40 p-4"
            data-modal=""
            id="students-upload-modal"
            role="dialog"
          >
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" data-modal-content="">
              <section aria-live="polite" className="space-y-3" data-students-mapping="" hidden id="students-mapping">
                <div
                  aria-describedby="students-mapping-support"
                  className="grid gap-3"
                  data-students-mapping-grid=""
                  id="students-mapping-grid"
                  role="group"
                ></div>
                <p className="text-xs text-neutral-500" id="students-mapping-support">
                  Required: First name and Last name. Optional fields improve personalised pathways.
                </p>
              </section>
              <form className="space-y-6" data-modal-body="" id="students-upload-form" noValidate>
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-neutral-900">Upload file</legend>
                  <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="students-upload-input">
                    Select roster file
                    <input
                      accept=".csv,.tsv,.xls,.xlsx,.ods,.pdf,.docx,.doc,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv"
                      aria-describedby="students-upload-help"
                      className="block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                      id="students-upload-input"
                      name="rosterFile"
                      type="file"
                    />
                  </label>
                  <p className="text-xs text-neutral-500" id="students-upload-help">
                    Supported formats: Excel (XLSX), CSV, PDF, Word (DOCX)
                  </p>
                </fieldset>
                <div className="text-sm text-red-600" data-students-upload-feedback="" hidden id="students-upload-feedback" role="alert"></div>
                <footer className="flex items-center justify-between gap-3">
                  <div aria-live="assertive" className="flex items-center gap-2 text-xs text-neutral-600" data-students-upload-status="" hidden id="students-upload-status">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600"
                      data-students-upload-spinner=""
                    ></span>
                    <span data-students-upload-status-text="">Processing roster...</span>
                  </div>
                  <button className="btn btn-ghost" data-modal-close="students-upload-modal" type="button">
                    Cancel
                  </button>
                  <button className="btn btn-primary" disabled id="students-upload-submit-btn" type="submit">
                    Import Students
                  </button>
                </footer>
              </form>
            </div>
          </article>

          <article
            aria-hidden="true"
            aria-labelledby="students-manual-title"
            aria-modal="true"
            className="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/40 p-4"
            data-modal=""
            id="students-manual-modal"
            role="dialog"
          >
            <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl" data-modal-content="">
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-neutral-900" id="students-manual-title">
                  Manual student entry
                </h2>
                <button
                  aria-label="Close manual entry modal"
                  className="inline-flex h-9 w-9 items-center justify-center w-[50px] h-[50px] rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-100"
                  data-modal-close="students-manual-modal"
                  type="button"
                >
                  x
                </button>
              </header>
              <form className="mt-4 space-y-6" data-modal-body="" id="students-manual-form" noValidate>
                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-neutral-900">Single student</legend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="manual-first-name">
                      First name*
                      <input
                        autoComplete="given-name"
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        id="manual-first-name"
                        name="first_name"
                        required
                        type="text"
                      />
                    </label>
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="manual-last-name">
                      Last name*
                      <input
                        autoComplete="family-name"
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        id="manual-last-name"
                        name="last_name"
                        required
                        type="text"
                      />
                    </label>
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="manual-email">
                      Email
                      <input
                        autoComplete="email"
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        id="manual-email"
                        name="email"
                        placeholder="learner@school.org (optional)"
                        type="email"
                      />
                    </label>
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="manual-student-id">
                      Student ID
                      <input
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        id="manual-student-id"
                        name="student_id"
                        placeholder="Auto-generated if blank"
                        type="text"
                      />
                    </label>
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="manual-grade-level">
                      Grade level
                      <select
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        id="manual-grade-level"
                        name="grade_level"
                      >
                        <option value="">Select grade level</option>
                        <option value="Elementary">Elementary</option>
                        <option value="Middle">Middle</option>
                        <option value="High School">High School</option>
                        <option value="Undergraduate">Undergraduate</option>
                        <option value="Professional">Professional</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="manual-enrollment-date">
                      Enrollment date
                      <input
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        id="manual-enrollment-date"
                        name="enrollment_date"
                        type="date"
                      />
                    </label>
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="manual-learning-style">
                      Learning style preferences
                      <input
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        id="manual-learning-style"
                        name="learning_style"
                        placeholder="e.g., Visual, Collaborative"
                        type="text"
                      />
                    </label>
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="manual-assessment-score">
                      Initial assessment score
                      <input
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        id="manual-assessment-score"
                        name="assessment_score"
                        placeholder="Optional score"
                        step="0.1"
                        type="number"
                      />
                    </label>
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="manual-notes">
                      Custom notes
                      <textarea
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        id="manual-notes"
                        name="notes"
                        placeholder="Pedagogy flags like 'needs extra simulations'"
                        rows={3}
                      ></textarea>
                    </label>
                  </div>
                </fieldset>
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-neutral-900">Bulk entry</legend>
                  <p className="text-xs text-neutral-500">
                    Paste CSV-style rows (First name, Last name, Email, Student ID, Grade level, Learning style,
                    Assessment score, Enrollment date, Notes). Missing optional fields will fall back to defaults.
                  </p>
                  <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2" htmlFor="manual-bulk-input">
                    Bulk students
                    <textarea
                      className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                      id="manual-bulk-input"
                      name="bulk_students"
                      placeholder="Jane,Doe,jane@school.org,12345,High School,Visual,88,2024-08-24,Loves experiments"
                      rows={6}
                      defaultValue=""
                    ></textarea>
                  </label>
                </fieldset>
                <div className="text-sm text-red-600" data-students-manual-feedback="" hidden id="students-manual-feedback" role="alert"></div>
                <footer className="flex items-center justify-between gap-3">
                  <div aria-live="assertive" className="flex items-center gap-2 text-xs text-neutral-600" data-students-manual-status="" hidden id="students-manual-status">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600"
                      data-students-manual-spinner=""
                    ></span>
                    <span data-students-manual-status-text="">Saving students...</span>
                  </div>
                  <button className="btn btn-ghost" data-modal-close="students-manual-modal" type="button">
                    Cancel
                  </button>
                  <button className="btn btn-primary" id="students-manual-submit-btn" type="submit">
                    Save Students
                  </button>
                </footer>
              </form>
            </div>
          </article>
        </div>
      );
    }

    if (activeSetupSection === "pedagogy") {
      return (
        <div className="space-y-6">
          <form className="space-y-6" id="course-pedagogy-form">
            <input id="course-pedagogy-input" name="course_pedagogy" type="hidden" />
            <div className="space-y-4" id="pedagogy-ui">
              <figure
                aria-label="Pedagogical coordinate plane"
                className="relative h-72 w-full rounded-xl border border-neutral-200 bg-white"
                data-learning-plane-grid=""
                role="application"
                tabIndex={0}
              >
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-500"
                  data-learning-plane-axis="left"
                >
                  Essentialist
                </span>
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-500"
                  data-learning-plane-axis="right"
                >
                  Progressive
                </span>
                <span
                  className="absolute left-1/2 top-3 -translate-x-1/2 text-xs font-semibold text-neutral-500"
                  data-learning-plane-axis="top"
                >
                  Constructivist
                </span>
                <span
                  className="absolute left-1/2 bottom-3 -translate-x-1/2 text-xs font-semibold text-neutral-500"
                  data-learning-plane-axis="bottom"
                >
                  Behaviorist
                </span>
                <span
                  aria-hidden="true"
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600 shadow"
                  data-learning-plane-marker=""
                  id="pedagogy-marker"
                ></span>
              </figure>
              <div className="flex items-center gap-6 text-sm text-neutral-600" data-learning-plane-coords="">
                <p className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-500">X</span>
                  <output className="text-sm font-semibold text-neutral-900" id="pedagogy-x">
                    0
                  </output>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-500">Y</span>
                  <output className="text-sm font-semibold text-neutral-900" id="pedagogy-y">
                    0
                  </output>
                </p>
              </div>
              <menu aria-label="Preset positions" className="flex flex-wrap gap-2" data-learning-plane-presets="">
                <button className="btn btn-ghost" data-preset data-x="-75" data-y="-75" type="button">
                  Traditional
                </button>
                <button className="btn btn-ghost" data-preset data-x="75" data-y="75" type="button">
                  Progressive
                </button>
                <button className="btn btn-ghost" data-preset data-x="-25" data-y="75" type="button">
                  Guided Discovery
                </button>
                <button className="btn btn-ghost" data-preset data-x="0" data-y="0" type="button">
                  Balanced
                </button>
              </menu>
            </div>
          </form>

          <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="space-y-3" data-learning-plane-summary="">
              <h3
                className="text-lg font-semibold text-neutral-900"
                data-learning-plane-summary-title=""
                id="pedagogy-approach-title"
              >
                Balanced
              </h3>
              <p
                className="text-sm text-neutral-500"
                data-learning-plane-summary-subtitle=""
                id="pedagogy-approach-subtitle"
              >
                <em>Essentialist x Behaviorist - Progressive x Constructivist</em>
              </p>
              <p
                className="text-sm text-neutral-600"
                data-learning-plane-summary-description=""
                id="pedagogy-approach-desc"
              >
                A balanced blend of teacher guidance, student agency, and mixed knowledge construction.
              </p>
              <div className="space-y-2" data-learning-plane-effects="">
                <h4 className="text-sm font-semibold text-neutral-800">Effects</h4>
                <ul className="space-y-2 text-sm text-neutral-600" data-learning-plane-effects-list="" id="pedagogy-effects-list">
                  <li>Move the marker to see predicted outcomes.</li>
                </ul>
              </div>
            </div>
          </section>

          <div
            aria-live="polite"
            className="flex items-center gap-2 text-sm"
            data-status="empty"
            id="pedagogy-save-status"
          >
            <span aria-hidden="true" className="w-4 h-4"></span>
            <span className="truncate" data-status-text="">
              No data submitted yet
            </span>
          </div>
        </div>
      );
    }

    if (activeSetupSection === "templates") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="flex flex-col flex-1 min-h-0 p-6">
            <div className="flex items-center gap-2 mb-4 lg:hidden" data-article-toggle="">
              <button className="btn btn-ghost" data-article-toggle-btn="" data-view="config" type="button">
                Config
              </button>
              <button className="btn btn-ghost" data-article-toggle-btn="" data-view="preview" type="button">
                Preview
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
              <section className="flex flex-col bg-white border border-neutral-200 rounded-lg overflow-y-auto h-full p-6" data-article-panel="config">
                <div className="flex items-center gap-2 mb-4">
                  <button className="btn btn-primary" id="create-template-btn" type="button">
                    Create Template
                  </button>
                  <button className="btn btn-ghost" id="load-template-btn" type="button">
                    Load Template
                  </button>
                </div>
                <div className="space-y-4" id="template-config-content">
                  <p className="text-neutral-500 text-center py-8">
                    Select or create a template to configure its settings.
                  </p>
                </div>
              </section>
              <section
                className="flex flex-col bg-neutral-50 border border-neutral-200 rounded-lg overflow-y-auto h-full relative p-6"
                data-article-panel="preview"
              >
                <div id="template-preview-content">
                  <p className="text-neutral-500 text-center py-8">
                    Create a new template or select an existing one to see the preview here.
                  </p>
                </div>
              </section>
            </div>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="templates-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "schedule") {
      return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="flex flex-col rounded-lg border border-neutral-200 bg-white p-6">
            <form className="space-y-6" id="schedule-config">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium leading-6 text-neutral-900">
                  Start Date
                  <input
                    autoComplete="off"
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="start-date"
                    inputMode="numeric"
                    placeholder="DD.MM.YYYY"
                    required
                    type="text"
                  />
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900">
                  End Date
                  <input
                    autoComplete="off"
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="end-date"
                    inputMode="numeric"
                    placeholder="DD.MM.YYYY"
                    required
                    type="text"
                  />
                </label>
              </div>
              <fieldset aria-label="Days of the Week" className="flex flex-wrap gap-2">
                <legend className="block text-sm font-medium leading-6 text-neutral-900">Days of the Week</legend>
                <button className="btn btn-ghost" data-day="monday" type="button">
                  Mon
                </button>
                <button className="btn btn-ghost" data-day="tuesday" type="button">
                  Tue
                </button>
                <button className="btn btn-ghost" data-day="wednesday" type="button">
                  Wed
                </button>
                <button className="btn btn-ghost" data-day="thursday" type="button">
                  Thu
                </button>
                <button className="btn btn-ghost" data-day="friday" type="button">
                  Fri
                </button>
                <button className="btn btn-ghost" data-day="saturday" type="button">
                  Sat
                </button>
                <button className="btn btn-ghost" data-day="sunday" type="button">
                  Sun
                </button>
              </fieldset>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium leading-6 text-neutral-900">
                  Start Time
                  <input
                    autoComplete="off"
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="start-time"
                    inputMode="numeric"
                    placeholder="HH:MM"
                    required
                    type="text"
                  />
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900">
                  End Time
                  <input
                    autoComplete="off"
                    className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                    id="end-time"
                    inputMode="numeric"
                    placeholder="HH:MM"
                    required
                    type="text"
                  />
                </label>
              </div>
              <div className="space-y-4">
                <div className="block text-sm font-medium leading-6 text-neutral-900">Break Times</div>
                <div className="space-y-2" id="break-times-list"></div>
                <button className="btn btn-primary" id="add-break-time-btn" type="button">
                  +
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-primary" disabled id="schedule-course-btn" type="button">
                  Schedule Course
                </button>
                <button className="btn btn-danger" id="delete-schedule-btn" style={{ display: "none" }} type="button">
                  Delete Schedule
                </button>
              </div>
            </form>
            <div
              aria-live="polite"
              className="mt-4 flex items-center gap-2 text-sm"
              data-status="empty"
              id="schedule-save-status"
            >
              <span aria-hidden="true" className="w-4 h-4"></span>
              <span className="truncate" data-status-text="">
                No data submitted yet
              </span>
            </div>
          </section>

          <section className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-6" id="schedule-preview">
            <div className="space-y-2" data-schedule-preview-content="">
              <p className="text-neutral-500 text-center py-8">Click "Schedule Course" to generate your lesson schedule</p>
            </div>
            <p className="font-semibold text-neutral-900" data-schedule-total="">
              Total lessons: 0
            </p>
          </section>
        </div>
      );
    }

    if (activeSetupSection === "curriculum") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="flex flex-col flex-1 min-h-0 p-6">
            <div className="flex items-center gap-2 mb-4 lg:hidden" data-article-toggle="">
              <button className="btn btn-ghost" data-article-toggle-btn="" data-view="config" type="button">
                Config
              </button>
              <button className="btn btn-ghost" data-article-toggle-btn="" data-view="preview" type="button">
                Preview
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
              <section className="flex flex-col bg-white border border-neutral-200 rounded-lg overflow-y-auto h-full p-6" data-article-panel="config">
                <form className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-neutral-900">Module Organization</h3>
                    <div className="module-organization-options">
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          defaultChecked
                          id="module-org-linear"
                          name="module-organization"
                          type="radio"
                          value="linear"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">No Modules</span>
                          <span className="text-xs text-neutral-500">Lessons appear in a single list with no module grouping.</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          id="module-org-equal"
                          name="module-organization"
                          type="radio"
                          value="equal"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">Equal Modules</span>
                          <span className="text-xs text-neutral-500">Lessons are evenly distributed across modules of equal size.</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          id="module-org-custom"
                          name="module-organization"
                          type="radio"
                          value="custom"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">Custom Modules</span>
                          <span className="text-xs text-neutral-500">Define your own module boundaries.</span>
                        </div>
                      </label>
                    </div>
                    <div className="custom-modules-config disabled" id="custom-modules-config">
                      <div className="custom-modules-list" id="custom-modules-list"></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-neutral-900">Content Volume</h3>
                    <div className="content-volume-options">
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          data-duration="mini"
                          data-max="30"
                          name="content-volume"
                          type="radio"
                          value="mini"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">Mini</span>
                          <span className="text-xs text-neutral-400">&le; 30 min</span>
                          <span className="text-xs text-neutral-500">Short session with 1-2 topics and light tasks.</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          data-duration="single"
                          data-max="60"
                          defaultChecked
                          name="content-volume"
                          type="radio"
                          value="single"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">Standard</span>
                          <span className="text-xs text-neutral-400">&le; 60 min</span>
                          <span className="text-xs text-neutral-500">Normal lesson with balanced topics and tasks.</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          data-duration="double"
                          data-max="120"
                          name="content-volume"
                          type="radio"
                          value="double"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">Extended</span>
                          <span className="text-xs text-neutral-400">&le; 120 min</span>
                          <span className="text-xs text-neutral-500">Double-length lesson with more practice and discussion.</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          data-duration="triple"
                          data-max="180"
                          name="content-volume"
                          type="radio"
                          value="triple"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">Intensive</span>
                          <span className="text-xs text-neutral-400">&le; 180 min</span>
                          <span className="text-xs text-neutral-500">Long block for deeper coverage or projects.</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          data-duration="halfFull"
                          data-max="999"
                          name="content-volume"
                          type="radio"
                          value="halfFull"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">Full Day</span>
                          <span className="text-xs text-neutral-400">&gt; 180 min</span>
                          <span className="text-xs text-neutral-500">Workshop-style session with multiple breaks or modules.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-neutral-500">Fine-tune the content density for each lesson.</p>
                    <div className="structure-inputs">
                      <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                        Topics per lesson
                        <input
                          className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                          defaultValue={2}
                          id="curriculum-topics"
                          max={10}
                          min={1}
                          type="number"
                        />
                      </label>
                      <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                        Objectives per topic
                        <input
                          className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                          defaultValue={2}
                          id="curriculum-objectives"
                          max={5}
                          min={1}
                          type="number"
                        />
                      </label>
                      <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                        Tasks per objective
                        <input
                          className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                          defaultValue={2}
                          id="curriculum-tasks"
                          max={5}
                          min={1}
                          type="number"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-neutral-900">Course Type</h3>
                    <div className="course-type-options">
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          id="course-type-minimalist"
                          name="course-type"
                          type="radio"
                          value="minimalist"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">Minimalist Course</span>
                          <span className="text-xs text-neutral-500">Core instructional templates only</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          defaultChecked
                          id="course-type-essential"
                          name="course-type"
                          type="radio"
                          value="essential"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">Essential Course</span>
                          <span className="text-xs text-neutral-500">All Minimalist templates plus evaluation and certification</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          id="course-type-complete"
                          name="course-type"
                          type="radio"
                          value="complete"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">Complete Course</span>
                          <span className="text-xs text-neutral-500">Every available template included</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                          id="course-type-custom"
                          name="course-type"
                          type="radio"
                          value="custom"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-neutral-900">Custom Course</span>
                          <span className="text-xs text-neutral-500">Manually select any combination of templates</span>
                          <p className="text-xs text-neutral-500">Configure template placements below</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-neutral-900">Template Placement</h3>
                    <div className="template-placement" id="curriculum-template-placement-list"></div>
                  </div>
                </form>
              </section>
              <section className="flex flex-col bg-neutral-50 border border-neutral-200 rounded-lg overflow-y-auto h-full relative p-6" data-article-panel="preview">
                <div className="flex h-full flex-col" data-curriculum-preview="" id="curriculum-preview">
                  <div className="flex-1 overflow-auto" data-curriculum-preview-content="">
                    <div aria-live="polite" className="editable-surface"></div>
                  </div>
                </div>
              </section>
            </div>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="curriculum-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "generation") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="flex flex-col flex-1 min-h-0 p-6">
            <div className="flex items-center gap-2 mb-4 lg:hidden" data-article-toggle="">
              <button className="btn btn-ghost" data-article-toggle-btn="" data-view="config" type="button">
                Config
              </button>
              <button className="btn btn-ghost" data-article-toggle-btn="" data-view="preview" type="button">
                Preview
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
              <section className="flex flex-col bg-white border border-neutral-200 rounded-lg overflow-y-auto h-full p-6" data-article-panel="config">
                <form className="space-y-6" id="generation-settings-form">
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-neutral-900">Generate Curriculum Content</h3>
                    <div className="space-y-6">
                      <div className="grid gap-6">
                        <div className="space-y-3">
                          <h5 className="text-sm font-semibold text-neutral-900">Required Context</h5>
                          <label className="flex items-center gap-2 text-sm text-neutral-500">
                            <input
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                              defaultChecked
                              disabled
                              name="ai-context-essentials"
                              type="checkbox"
                            />
                            <span>Course Essentials</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm text-neutral-500">
                            <input
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                              defaultChecked
                              disabled
                              name="ai-context-classification"
                              type="checkbox"
                            />
                            <span>Classification</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm text-neutral-500">
                            <input
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                              defaultChecked
                              disabled
                              name="ai-context-pedagogy"
                              type="checkbox"
                            />
                            <span>Pedagogy Approach</span>
                          </label>
                        </div>
                        <div className="space-y-3">
                          <h5 className="text-sm font-semibold text-neutral-900">Optional Context</h5>
                          <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                              defaultChecked
                              name="ai-context-schedule"
                              type="checkbox"
                            />
                            <span>Schedule Settings</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                              defaultChecked
                              name="ai-context-structure"
                              type="checkbox"
                            />
                            <span>Content Structure</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                              name="ai-context-existing"
                              type="checkbox"
                            />
                            <span>Existing Curriculum Content</span>
                          </label>
                        </div>
                        <div className="space-y-3">
                          <h5 className="text-sm font-semibold text-neutral-900">Generation Actions</h5>
                          <div className="flex flex-wrap gap-3">
                            <button className="btn btn-primary" data-ai-generate="all" type="button">
                              Generate All
                            </button>
                            <button className="btn btn-ghost" data-ai-generate="modules" type="button">
                              Generate Module Names
                            </button>
                            <button className="btn btn-ghost" data-ai-generate="lessons" type="button">
                              Generate Lesson Names
                            </button>
                            <button className="btn btn-ghost" data-ai-generate="topics" type="button">
                              Generate Topic Titles
                            </button>
                            <button className="btn btn-ghost" data-ai-generate="objectives" type="button">
                              Generate Objectives
                            </button>
                            <button className="btn btn-ghost" data-ai-generate="tasks" type="button">
                              Generate Tasks
                            </button>
                          </div>
                          <div className="hidden" data-ai-status="" id="ai-generation-status">
                            <div className="flex items-center gap-2 text-sm text-neutral-600">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600"></div>
                              <span data-ai-status-text="">Initializing AI model...</span>
                            </div>
                            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                              <div className="h-full w-0 bg-primary-600" data-ai-progress-fill=""></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </section>
              <section className="flex flex-col bg-neutral-50 border border-neutral-200 rounded-lg overflow-y-auto h-full relative p-6" data-article-panel="preview">
                <div className="flex h-full flex-col" data-curriculum-preview="" id="generation-preview">
                  <div className="flex-1 overflow-auto" data-curriculum-preview-content="">
                    <nav aria-label="Generation view modes" className="flex flex-wrap gap-2" data-curriculum-controls="">
                      <button className="btn btn-ghost" data-mode="modules" type="button">
                        Modules
                      </button>
                      <button className="btn btn-ghost" data-mode="titles" type="button">
                        Lessons
                      </button>
                      <button className="btn btn-ghost" data-mode="competencies" type="button">
                        Competencies
                      </button>
                      <button className="btn btn-ghost" data-mode="topics" type="button">
                        Topics
                      </button>
                      <button className="btn btn-ghost" data-mode="objectives" type="button">
                        Objectives
                      </button>
                      <button className="btn btn-ghost" data-mode="tasks" type="button">
                        Tasks
                      </button>
                      <button className="btn btn-ghost" data-mode="all" type="button">
                        All
                      </button>
                    </nav>
                    <div aria-live="polite" className="editable-surface"></div>
                  </div>
                </div>
              </section>
            </div>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="generation-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "course-visibility") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <form className="space-y-4" id="course-visibility-form">
              <fieldset className="space-y-3">
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                  <input className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" name="course_visible" type="checkbox" />
                  Course visible to students
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                  <input className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" name="allow_enrollment" type="checkbox" />
                  Allow new enrollments
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                  <input className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" name="require_approval" type="checkbox" />
                  Require enrollment approval
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                  <input className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" name="enable_notifications" type="checkbox" />
                  Enable email notifications for new enrollments
                </label>
                <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                  <input className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" name="public_course" type="checkbox" />
                  Make course publicly discoverable
                </label>
              </fieldset>
            </form>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="course-visibility-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "marketplace") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <form className="space-y-6" id="marketplace-form">
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Listing Status
                <select
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="listing_status"
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Review</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Target Audience
                <input
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="target_audience"
                  placeholder="e.g., Grade 11 Humanities"
                  type="text"
                />
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Revenue Share (%)
                <input
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  max={100}
                  min={0}
                  name="revenue_share"
                  placeholder="30"
                  step={1}
                  type="number"
                />
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Distribution Channels
                <textarea
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="distribution_channels"
                  placeholder="List marketplaces or partner channels"
                ></textarea>
              </label>
            </form>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="marketplace-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "pricing-monetization") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <form className="space-y-6" id="pricing-monetization-form">
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Pricing Model
                <select
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="pricing_model"
                >
                  <option value="free">Free</option>
                  <option value="subscription">Subscription</option>
                  <option value="one-time">One-time purchase</option>
                  <option value="license">Site license</option>
                </select>
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Base Price
                <input
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  min={0}
                  name="base_price"
                  placeholder="99"
                  step={1}
                  type="number"
                />
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Currency
                <select
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="currency"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                <input className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" name="trial_available" type="checkbox" />
                Offer free trial
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Discount Notes
                <textarea
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="discount_notes"
                  placeholder="Describe educator or early-bird discounts"
                ></textarea>
              </label>
            </form>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="pricing-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "external-integrations") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <form className="space-y-6" id="external-integrations-form">
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                LMS Provider
                <select
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="lms_provider"
                >
                  <option value="None">None</option>
                  <option value="Canvas">Canvas</option>
                  <option value="Moodle">Moodle</option>
                  <option value="Schoology">Schoology</option>
                </select>
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                <input className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" name="api_access" type="checkbox" />
                Enable API access for this course
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Webhook URL
                <input
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="webhook_url"
                  placeholder="https://example.com/webhook"
                  type="text"
                />
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Integration Notes
                <textarea
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="integration_notes"
                  placeholder="Describe external automation related to this course"
                ></textarea>
              </label>
            </form>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="integrations-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "communication") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <form className="space-y-6" id="communication-form">
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Welcome Message
                <textarea
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="welcome_message"
                  placeholder="Send a short welcome note to enrolled students"
                ></textarea>
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Announcement Channel
                <select
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="announcement_channel"
                >
                  <option value="email">Email</option>
                  <option value="in-app">In-app</option>
                  <option value="sms">SMS</option>
                </select>
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                <input className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" name="enable_updates" type="checkbox" />
                Enable weekly update digest
              </label>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Office Hours
                <input
                  className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                  name="office_hours"
                  placeholder="Thursdays 3-5pm CET"
                  type="text"
                />
              </label>
            </form>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="communication-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "page-setup") {
      return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="flex flex-col rounded-lg border border-neutral-200 bg-white p-6">
            <form className="space-y-6" id="page-setup-form">
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-neutral-900">Units</legend>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                    defaultChecked
                    name="units"
                    type="radio"
                    value="cm"
                  />
                  Metric (cm)
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                    name="units"
                    type="radio"
                    value="inches"
                  />
                  Imperial (inches)
                </label>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-neutral-900">Orientation</legend>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                    defaultChecked
                    name="orientation"
                    type="radio"
                    value="portrait"
                  />
                  Portrait
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                    name="orientation"
                    type="radio"
                    value="landscape"
                  />
                  Landscape
                </label>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-neutral-900">Canvas Size</legend>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                    defaultChecked
                    name="canvas-size"
                    type="radio"
                    value="a4"
                  />
                  <span
                    className="canvas-size-label"
                    data-cm="A4 (21.0 x 29.7 cm)"
                    data-inches={'A4 (8.27" x 11.69")'}
                  >
                    A4 (21.0 x 29.7 cm)
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600 border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                    name="canvas-size"
                    type="radio"
                    value="us-letter"
                  />
                  <span
                    className="canvas-size-label"
                    data-cm="US Letter (21.6 x 27.9 cm)"
                    data-inches={'US Letter (8.5" x 11")'}
                  >
                    US Letter (21.6 x 27.9 cm)
                  </span>
                </label>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-neutral-900">Margins</legend>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm text-neutral-700">
                      Top
                      <input
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        max={100}
                        min={0}
                        name="margin_top"
                        step="0.01"
                        type="number"
                        defaultValue={2.54}
                      />
                      <span className="text-xs text-neutral-500" data-page-setup-unit="">
                        cm
                      </span>
                    </label>
                    <label className="flex flex-col gap-2 text-sm text-neutral-700">
                      Bottom
                      <input
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        max={100}
                        min={0}
                        name="margin_bottom"
                        step="0.01"
                        type="number"
                        defaultValue={2.54}
                      />
                      <span className="text-xs text-neutral-500" data-page-setup-unit="">
                        cm
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm text-neutral-700">
                      Left
                      <input
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        max={100}
                        min={0}
                        name="margin_left"
                        step="0.01"
                        type="number"
                        defaultValue={2.54}
                      />
                      <span className="text-xs text-neutral-500" data-page-setup-unit="">
                        cm
                      </span>
                    </label>
                    <label className="flex flex-col gap-2 text-sm text-neutral-700">
                      Right
                      <input
                        className="block w-full rounded-md border border-neutral-300 px-4 py-3 text-neutral-900 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                        max={100}
                        min={0}
                        name="margin_right"
                        step="0.01"
                        type="number"
                        defaultValue={2.54}
                      />
                      <span className="text-xs text-neutral-500" data-page-setup-unit="">
                        cm
                      </span>
                    </label>
                  </div>
                </div>
              </fieldset>
            </form>
          </section>

          <section className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-6">
            <div className="space-y-4" data-page-setup-preview="">
              <p className="text-neutral-500 text-center py-8" id="page-setup-preview-placeholder">
                Adjust page settings to refresh the live preview instantly.
              </p>
              <h3 className="text-sm font-semibold text-neutral-900">Page Preview</h3>
              <div className="space-y-3" data-page-setup-canvas-container="">
                <canvas
                  className="h-auto w-full rounded-lg border border-neutral-200 bg-white"
                  data-page-setup-canvas=""
                  height={500}
                  id="page-preview-canvas"
                  width={400}
                ></canvas>
                <div className="space-y-1 text-xs text-neutral-500" data-page-setup-canvas-info="">
                  <output className="block" data-page-setup-dimensions="" id="canvas-dimensions">
                    210 x 297 mm (A4 Portrait)
                  </output>
                  <output className="block" data-page-setup-margins-info="" id="margins-info">
                    Margins: 2.54mm all sides
                  </output>
                </div>
              </div>
            </div>
          </section>
        </div>
      );
    }

    if (activeSetupSection === "interface") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <p className="text-neutral-500 text-center py-8">Interface content will be added here.</p>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="interface-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "themes") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <p className="text-neutral-500 text-center py-8">Themes content will be added here.</p>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="themes-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "accessibility-comfort") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <p className="text-neutral-500 text-center py-8">Accessibility &amp; Comfort content will be added here.</p>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="accessibility-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "notifications-alerts") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <p className="text-neutral-500 text-center py-8">Notifications &amp; Alerts content will be added here.</p>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="notifications-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "data-management") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <p className="text-neutral-500 text-center py-8">Data Management &amp; Backup content will be added here.</p>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="data-management-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    if (activeSetupSection === "advanced-settings") {
      return (
        <div className="flex flex-col min-h-0">
          <div className="p-6 bg-white">
            <section className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="text-base font-semibold text-red-700">Danger Zone</h3>
              <p className="mt-2 text-sm text-red-600">Once you delete a course, there is no going back. Please be certain.</p>
              <button className="btn btn-danger" id="delete-course-btn">
                Delete Course
              </button>
            </section>
          </div>
          <footer className="mt-auto pt-6 px-6 pb-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="flex items-center gap-2 text-sm" data-status="empty" id="advanced-settings-save-status">
                <span aria-hidden="true" className="w-4 h-4"></span>
                <span className="truncate" data-status-text="">
                  No data submitted yet
                </span>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
        Configure {(activeSetupSection as string).replace(/-/g, " ")} settings here.
      </div>
    );
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
          <button
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={handlePreviousSection}
            disabled={!canGoPrevious}
          >
            Previous
          </button>
          <div className="text-lg font-semibold tracking-tight">Neptino</div>
          <button
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={handleNextSection}
            disabled={!canGoNext}
          >
            Next
          </button>
        </nav>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <section
          aria-hidden={activeSection !== "setup"}
          className={`grid h-full min-h-0 w-full grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[260px_1fr] ${
            activeSection === "setup" ? "" : "hidden"
          }`}
          data-coursebuilder-section="setup"
          id="setup"
        >
          <aside className="hidden min-h-0 flex-col rounded-lg border border-border bg-card p-4 md:flex">
            <nav className="flex-1 space-y-6 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {setupNavGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {group.items.map((item) => (
                      <li key={item.key}>
                        <button
                          className={
                            activeSetupSection === item.key
                              ? "w-full rounded-md bg-primary-400 px-3 py-2 text-left text-sm font-medium text-white"
                              : "w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          }
                          type="button"
                          onClick={() => setActiveSetupSection(item.key)}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-xl font-semibold text-foreground">
                {setupNavGroups.flatMap((group) => group.items).find((item) => item.key === activeSetupSection)?.label}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{statusLabels[activeSetupSection]}</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="space-y-6">{renderSetupSection()}</div>
            </div>
            <div className="border-t border-border px-6 py-4 text-sm text-muted-foreground">
              Status: {statusLabels[activeSetupSection]}
            </div>
          </div>
        </section>

        <section
          aria-hidden={activeSection !== "create"}
          className={`${activeSection === "create" ? "flex min-h-0 flex-1 h-full" : "hidden"}`}
          data-coursebuilder-section="create"
          id="create"
        >
          <div className="engine grid h-full min-h-0 w-full flex-1 overflow-hidden grid-rows-[minmax(0,1fr)] grid-cols-[var(--engine-search-width,320px)_8px_1fr_8px_var(--engine-panel-width,260px)] p-3 gap-0 items-stretch [&_button_span]:truncate">
            <div
              className="flex h-full min-h-0 rounded-lg bg-white border border-neutral-200 shadow-md overflow-hidden"
              data-engine-content=""
            >
              <div
                className="flex flex-col items-center gap-1.5 pt-3 pb-2 px-1.5 bg-neutral-50/30 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                data-engine-media=""
              >
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-media="files"
                  title="Files"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/media/media-files.svg" />
                  <span className="text-[11px] leading-tight font-medium">Files</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-media="images"
                  title="Images"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/media/media-image.svg" />
                  <span className="text-[11px] leading-tight font-medium">Images</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-media="videos"
                  title="Videos"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/media/media-video.svg" />
                  <span className="text-[11px] leading-tight font-medium">Videos</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-media="audio"
                  title="Audio"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/media/media-audio.svg" />
                  <span className="text-[11px] leading-tight font-medium">Audio</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-media="text"
                  title="Text"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/media/media-text.svg" />
                  <span className="text-[11px] leading-tight font-medium">Text</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-media="plugin"
                  title="Plugins"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/media/media-plugins.svg" />
                  <span className="text-[11px] leading-tight font-medium">Plugins</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-media="links"
                  title="Links"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/media/media-link.svg" />
                  <span className="text-[11px] leading-tight font-medium">Links</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-media="games"
                  title="Games"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/media/media-interactive.svg" />
                  <span className="text-[11px] leading-tight font-medium">Games</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-media="graphs"
                  title="Graphs"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/media/media-table.svg" />
                  <span className="text-[11px] leading-tight font-medium">Graphs</span>
                </button>

                <div className="w-8 border-t border-neutral-200 my-1"></div>

                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-media="encyclopedia"
                  title="Encyclopedia"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/navigation/navigation-toc.svg" />
                  <span className="text-[11px] leading-tight font-medium">Encyclo</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-media="marketplace"
                  title="Forge Marketplace"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/navigation/navigation-layers.svg" />
                  <span className="text-[11px] leading-tight font-medium">Forge</span>
                </button>
              </div>

              <div
                className="flex flex-col flex-1 min-w-0 min-h-0 pt-3 pr-3 pb-3 pl-1.5 gap-2 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                data-engine-search=""
              >
                <input
                  className="block w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  id="media-search-input"
                  placeholder="Search media..."
                  type="search"
                />
              </div>
            </div>

            <button
              aria-label="Resize search column"
              className="group relative flex items-center justify-center w-2 min-w-[8px] cursor-col-resize border-none bg-transparent transition-colors focus-visible:outline-none"
              data-engine-resizer="search"
              type="button"
            >
              <span
                aria-hidden="true"
                className="h-7 w-1.5 rounded-sm bg-primary-300 shadow-sm transition-colors group-hover:bg-primary-400 group-focus-visible:bg-primary-400"
              ></span>
            </button>

            <div
              className="relative min-h-0 overflow-hidden bg-white rounded-lg border border-neutral-200 shadow-sm"
              data-engine-canvas=""
              id="canvas-container"
            >
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5 rounded-lg bg-white border border-neutral-200 shadow-md p-2"
                data-engine-perspective=""
              >
                <div
                  className="rounded-md bg-white/80 px-2 py-1 text-xs font-semibold text-neutral-600 shadow-sm backdrop-blur-sm text-center"
                  data-engine-perspective-zoom=""
                  title="Current zoom level"
                >
                  100%
                </div>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-perspective="zoom-in"
                  title="Focus"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/perspective/zoomin-icon.svg" />
                  <span className="text-[11px] leading-tight font-medium">Focus</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-perspective="zoom-out"
                  title="Expand"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/perspective/zoomout-icon.svg" />
                  <span className="text-[11px] leading-tight font-medium">Expand</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-perspective="reset"
                  title="Reset View"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/perspective/reset-icon.svg" />
                  <span className="text-[11px] leading-tight font-medium">Reset</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-perspective="grab"
                  title="Grab"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/perspective/grab-icon.svg" />
                  <span className="text-[11px] leading-tight font-medium">Grab</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  data-perspective="grid"
                  data-snap-anchor=""
                  title="Grid"
                  type="button"
                >
                  <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/perspective/grid-icon.svg" />
                  <span className="text-[11px] leading-tight font-medium">Grid</span>
                </button>
              </div>

              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5 rounded-lg bg-white border border-neutral-200 shadow-md p-2"
                data-engine-scroll=""
              >
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  onClick={scrollNav.goToFirst}
                  title="Go to first canvas"
                  type="button"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 15l-6-6-6 6" />
                    <path d="M18 9l-6-6-6 6" />
                  </svg>
                  <span className="text-[11px] leading-tight font-medium">First</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  onClick={scrollNav.goToPrevious}
                  title="Previous canvas"
                  type="button"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                  <span className="text-[11px] leading-tight font-medium">Prev</span>
                </button>
                <div
                  className="flex flex-col items-center justify-center w-[50px] h-[50px] rounded-md border border-neutral-200 bg-white shadow-sm"
                >
                  <input
                    aria-label="Current canvas number"
                    className="w-full bg-transparent text-center text-[11px] font-medium text-neutral-700 focus:outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    id="engine-scroll-input"
                    min={1}
                    max={scrollNav.totalCanvases}
                    name="engine-scroll-input"
                    onChange={scrollNav.handleInputChange}
                    onKeyDown={scrollNav.handleInputKeyDown}
                    title="Current canvas number"
                    type="number"
                    value={scrollNav.currentCanvas}
                  />
                  <span className="h-px w-4 bg-neutral-300"></span>
                  <span className="text-[11px] text-neutral-500" title="Total canvases">
                    {scrollNav.totalCanvases}
                  </span>
                </div>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  onClick={scrollNav.goToNext}
                  title="Next canvas"
                  type="button"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  <span className="text-[11px] leading-tight font-medium">Next</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  onClick={scrollNav.goToLast}
                  title="Go to last canvas"
                  type="button"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6" />
                    <path d="M6 15l6 6 6-6" />
                  </svg>
                  <span className="text-[11px] leading-tight font-medium">Last</span>
                </button>
              </div>

              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 flex-col gap-2" data-engine-controls="">
                <div
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white/90 px-3 py-1.5 shadow-md backdrop-blur-sm"
                  data-engine-tools=""
                >
                  <div
                    className="flex flex-wrap items-center gap-3 min-h-[52px] [&_[data-control]]:border-0 [&_[data-control]]:bg-transparent [&_[data-control]]:shadow-none [&_select]:h-8 [&_select]:py-0 [&_select]:text-[0.8125rem] [&_input[type='number']]:h-8 [&_input[type='number']]:py-0 [&_input[type='number']]:text-[0.8125rem] [&_input[type='text']]:h-8 [&_input[type='text']]:py-0 [&_input[type='text']]:text-[0.8125rem] [&_[data-button-stepper]]:h-8 [&_[data-button-stepper]]:px-2 [&_[data-button-stepper]]:text-[0.8125rem] [&_[data-color-trigger]]:h-8 [&_[data-color-trigger]]:w-8 [&_[data-color-trigger]]:p-0 [&_[data-color-trigger]]:rounded-md [&_[data-color-trigger]]:border [&_[data-color-trigger]]:border-neutral-300 [&_[data-color-trigger]]:inline-flex [&_[data-color-trigger]]:items-center [&_[data-color-trigger]]:justify-center [&_[data-color-trigger]]:bg-white [&_[data-color-trigger]]:shadow-sm [&_[data-color-trigger]_[data-color-preview]]:h-5 [&_[data-color-trigger]_[data-color-preview]]:w-5"
                    data-engine-tools-options=""
                  >
                    <div
                      className="flex items-center gap-2"
                      data-engine-tool-options="pen"
                      data-engine-tool-options-layout="horizontal"
                      style={{ display: "none" }}
                    >
                      <input
                        aria-label="Pen size"
                        className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        data-setting="size"
                        id="pen-size-input"
                        max={15}
                        min={1}
                        name="pen-size"
                        type="number"
                        defaultValue={2}
                      />
                      <div className="color-selector" data-color-selector="pen-stroke" data-initial-color="#282a29"></div>
                      <div
                        className="color-selector"
                        data-allow-transparent="true"
                        data-color-selector="pen-fill"
                        data-initial-color="#fef6eb"
                      ></div>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      data-engine-tool-options="text"
                      data-engine-tool-options-layout="horizontal"
                      style={{ display: "none" }}
                    >
                      <select
                        className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        data-setting="fontSize"
                        id="text-size-select"
                        defaultValue="16"
                      >
                        <option data-label="Normal" value="12">
                          Normal (12pt)
                        </option>
                        <option data-label="Title" value="26">
                          Title (26pt)
                        </option>
                        <option data-label="Header1" value="20">
                          H1 (20pt)
                        </option>
                        <option data-label="Header2" value="16">
                          H2 (16pt)
                        </option>
                        <option data-label="Header3" value="14">
                          H3 (14pt)
                        </option>
                      </select>
                      <div aria-label="Text Style" className="flex items-center gap-1" data-engine-text-style-controls="">
                        <button
                          className="inline-flex items-center justify-center w-[50px] h-[50px] rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-bold shadow-sm transition-all hover:bg-neutral-50 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          data-engine-text-style="bold"
                          type="button"
                        >
                          B
                        </button>
                        <button
                          className="inline-flex items-center justify-center w-[50px] h-[50px] rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-bold shadow-sm transition-all hover:bg-neutral-50 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          data-engine-text-style="italic"
                          type="button"
                        >
                          I
                        </button>
                      </div>
                      <select
                        className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        data-setting="fontFamily"
                        id="font-family-select"
                        defaultValue="Arial"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Tahoma">Tahoma</option>
                      </select>
                      <div className="color-selector" data-color-selector="text" data-initial-color="#282a29"></div>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      data-engine-tool-options="brush"
                      data-engine-tool-options-layout="horizontal"
                      style={{ display: "none" }}
                    >
                      <input
                        aria-label="Brush size"
                        className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        data-setting="size"
                        id="brush-size-input"
                        max={50}
                        min={10}
                        name="brush-size"
                        type="number"
                        defaultValue={20}
                      />
                      <div className="color-selector" data-color-selector="brush" data-initial-color="#2b8059"></div>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      data-engine-tool-options="shapes"
                      data-engine-tool-options-layout="horizontal"
                      style={{ display: "none" }}
                    >
                      <div className="shape-selector" data-initial-shape="rectangle" data-shape-selector="shapes"></div>
                      <input
                        aria-label="Stroke width"
                        className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        data-setting="strokeWidth"
                        id="shape-stroke-width-input"
                        max={20}
                        min={1}
                        name="shape-stroke-width"
                        type="number"
                        defaultValue={2}
                      />
                      <div className="color-selector" data-color-selector="shapes-stroke" data-initial-color="#282a29"></div>
                      <div
                        className="color-selector"
                        data-allow-transparent="true"
                        data-color-selector="shapes-fill"
                        data-initial-color="transparent"
                      ></div>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      data-engine-tool-options="eraser"
                      data-engine-tool-options-layout="horizontal"
                      style={{ display: "none" }}
                    >
                      <input
                        aria-label="Eraser size"
                        className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        data-setting="size"
                        id="eraser-size-input"
                        max={50}
                        min={5}
                        name="eraser-size"
                        type="number"
                        defaultValue={20}
                      />
                    </div>
                    <div
                      className="flex items-center gap-2"
                      data-engine-tool-options="tables"
                      data-engine-tool-options-layout="horizontal"
                      style={{ display: "none" }}
                    >
                      <input
                        aria-label="Table size"
                        className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        data-setting="size"
                        id="table-size-input"
                        max={20}
                        min={1}
                        name="table-size"
                        type="number"
                        defaultValue={3}
                      />
                      <select
                        aria-label="Table type"
                        className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        data-setting="tableType"
                        id="table-type-select"
                        name="table-type"
                        defaultValue="basic"
                      >
                        <option value="basic">Basic</option>
                        <option value="bordered">Bordered</option>
                        <option value="striped">Striped</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/90 px-2 py-1.5 shadow-md backdrop-blur-sm"
                  data-engine-tools=""
                >
                  <div className="flex items-center gap-1.5 border-r border-neutral-200 pr-2" data-engine-modes="">
                    <button
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="build"
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/modes/mode-build.svg" />
                      <span className="text-[11px] leading-tight font-medium">Build</span>
                    </button>
                    <button
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="animate"
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/modes/mode-animate.svg" />
                      <span className="text-[11px] leading-tight font-medium">Animate</span>
                    </button>
                  </div>
                  <div className="flex flex-nowrap items-center gap-1.5" data-engine-tools-selection="">
                    <button
                      aria-label="Select"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="build"
                      data-tool="selection"
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/tools/tool-select.svg" />
                      <span className="text-[11px] leading-tight font-medium">Select</span>
                    </button>
                    <button
                      aria-label="Pen"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="build"
                      data-tool="pen"
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/tools/tool-pen.svg" />
                      <span className="text-[11px] leading-tight font-medium">Pen</span>
                    </button>
                    <button
                      aria-label="Brush"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="build"
                      data-tool="brush"
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/tools/tool-brush.svg" />
                      <span className="text-[11px] leading-tight font-medium">Brush</span>
                    </button>
                    <button
                      aria-label="Text"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="build"
                      data-tool="text"
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/tools/tool-write.svg" />
                      <span className="text-[11px] leading-tight font-medium">Text</span>
                    </button>
                    <button
                      aria-label="Shapes"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="build"
                      data-tool="shapes"
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/tools/tool-shapes.svg" />
                      <span className="text-[11px] leading-tight font-medium">Shapes</span>
                    </button>
                    <button
                      aria-label="Tables"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="build"
                      data-tool="tables"
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/media/media-table.svg" />
                      <span className="text-[11px] leading-tight font-medium">Tables</span>
                    </button>
                    <button
                      aria-label="Generate"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="build"
                      data-tool="generate"
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/bot-icon.svg" />
                      <span className="text-[11px] leading-tight font-medium">Generate</span>
                    </button>
                    <button
                      aria-label="Eraser"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="build"
                      data-tool="eraser"
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/tools/tool-eraser.svg" />
                      <span className="text-[11px] leading-tight font-medium">Eraser</span>
                    </button>
                    <button
                      aria-label="Select"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="animate"
                      data-tool="selection"
                      style={{ display: "none" }}
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/tools/tool-select.svg" />
                      <span className="text-[11px] leading-tight font-medium">Select</span>
                    </button>
                    <button
                      aria-label="Scene"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="animate"
                      data-tool="scene"
                      style={{ display: "none" }}
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/modes/mode-animate.svg" />
                      <span className="text-[11px] leading-tight font-medium">Scene</span>
                    </button>
                    <button
                      aria-label="Path"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="animate"
                      data-tool="path"
                      style={{ display: "none" }}
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/tools/tool-pen.svg" />
                      <span className="text-[11px] leading-tight font-medium">Path</span>
                    </button>
                    <button
                      aria-label="Modify"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white w-[50px] h-[50px] shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      data-mode="animate"
                      data-tool="modify"
                      style={{ display: "none" }}
                      type="button"
                    >
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/tools/tool-shapes.svg" />
                      <span className="text-[11px] leading-tight font-medium">Modify</span>
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="absolute right-6 top-24 z-20 hidden w-72 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg"
                data-snap-menu=""
                id="snap-menu"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-800" data-snap-option="smart">
                  <input
                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600"
                    defaultChecked
                    id="smart-guides-toggle"
                    type="checkbox"
                  />
                  <span>Smart Guides</span>
                </div>
                <div className="mt-4 space-y-3" data-snap-section="">
                  <div className="flex items-center gap-2 text-sm text-neutral-700" data-smart-setting="showDistToAll">
                    <input
                      className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600"
                      defaultChecked
                      id="showDistToAll"
                      type="checkbox"
                    />
                    <label htmlFor="showDistToAll">Distance Labels</label>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700" data-smart-setting="enableResizeGuides">
                    <input
                      className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600"
                      defaultChecked
                      id="enableResizeGuides"
                      type="checkbox"
                    />
                    <label htmlFor="enableResizeGuides">Resize Guides</label>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700" data-smart-setting="enableSmartSelection">
                    <input
                      className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600"
                      defaultChecked
                      id="enableSmartSelection"
                      type="checkbox"
                    />
                    <label htmlFor="enableSmartSelection">Smart Selection</label>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700" data-smart-setting="enableColorCoding">
                    <input
                      className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600"
                      defaultChecked
                      id="enableColorCoding"
                      type="checkbox"
                    />
                    <label htmlFor="enableColorCoding">Color Coding</label>
                  </div>
                </div>
                <div className="my-4 h-px bg-neutral-200"></div>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 text-sm text-neutral-700" data-distribute="horizontal">
                    <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/perspective/snap-smart.svg" />
                    <span>Distribute Horizontally</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700" data-distribute="vertical">
                    <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/perspective/snap-smart.svg" />
                    <span>Distribute Vertically</span>
                  </div>
                </div>
                <div className="my-4 h-px bg-neutral-200"></div>
                <div className="space-y-2" data-snap-guide-modes="">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Smart Guide Reference</label>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700" data-reference-mode="canvas">
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/perspective/snap-canvas.svg" />
                      <span>Canvas Reference</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700" data-reference-mode="object">
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/perspective/snap-objects.svg" />
                      <span>Object Reference</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700" data-reference-mode="grid">
                      <img alt="" className="h-6 w-6" src="/assets/icons/coursebuilder/perspective/grid-icon.svg" />
                      <span>Grid Reference</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-3" data-snap-grid-options="" id="grid-options" style={{ display: "none" }}>
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      className="h-4 w-4 shrink-0 cursor-pointer accent-primary-600"
                      defaultChecked
                      id="show-grid"
                      type="checkbox"
                    />
                    <label htmlFor="show-grid">Show grid</label>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <label htmlFor="grid-spacing">Grid spacing:</label>
                    <input
                      className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      id="grid-spacing"
                      max={100}
                      min={1}
                      type="number"
                      defaultValue={20}
                    />
                    <span className="text-xs text-neutral-500">px</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              aria-label="Resize inspector panel"
              className="group relative flex items-center justify-center w-2 min-w-[8px] cursor-col-resize border-none bg-transparent transition-colors focus-visible:outline-none"
              data-engine-resizer="panel"
              type="button"
            >
              <span
                aria-hidden="true"
                className="h-7 w-1.5 rounded-sm bg-primary-300 shadow-sm transition-colors group-hover:bg-primary-400 group-focus-visible:bg-primary-400"
              ></span>
            </button>

            <div
              className="flex flex-col min-h-0 overflow-hidden bg-white rounded-lg border border-neutral-200 shadow-sm"
              data-engine-panel=""
            >
              <div className="flex items-stretch border-b border-neutral-200" data-engine-panel-header="">
                <div className="flex items-stretch flex-1" data-engine-panel-toggle="">
                  <button
                    aria-label="Show Layers panel"
                    {...getPanelButtonProps("layers")}
                  >
                    Layers
                  </button>
                  <button
                    aria-label="Show Navigation panel"
                    {...getPanelButtonProps("navigation")}
                  >
                    Navigation
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-3" data-engine-panel-content="">
                <div data-engine-panel-view="" data-view="layers" className={isPanelVisible("layers") ? "" : "hidden"}>
                  <ol className="layers-list" id="layers-list-root"></ol>
                </div>
                <div data-engine-panel-view="" data-view="navigation" className={isPanelVisible("navigation") ? "" : "hidden"}>
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-500">Loading course outline...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-hidden={activeSection !== "preview"}
          className={`rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground ${
            activeSection === "preview" ? "" : "hidden"
          }`}
          data-coursebuilder-section="preview"
          id="preview"
        >
          Course preview will be displayed here.
        </section>

        <section
          aria-hidden={activeSection !== "launch"}
          className={`rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground ${
            activeSection === "launch" ? "" : "hidden"
          }`}
          data-coursebuilder-section="launch"
          id="launch"
        >
          Course launch options will be available here.
        </section>
      </main>
    </div>
  );
}
