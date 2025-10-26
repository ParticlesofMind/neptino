import { CurriculumLesson } from "../curriculumManager.js";

export class LessonStructure {
  /**
   * Summarize lesson structure (topics, objectives, tasks counts)
   */
  static summarize(
    lesson: CurriculumLesson | null | undefined,
  ): { topics: number; objectives: number; tasks: number } {
    if (!lesson) {
      return { topics: 0, objectives: 0, tasks: 0 };
    }

    const topics = Array.isArray(lesson.topics) ? lesson.topics : [];

    let objectives = 0;
    let tasks = 0;

    topics.forEach((topic) => {
      objectives += Array.isArray(topic.objectives)
        ? topic.objectives.length
        : 0;
      tasks += Array.isArray(topic.tasks) ? topic.tasks.length : 0;
    });

    return {
      topics: topics.length,
      objectives,
      tasks,
    };
  }

  /**
   * Build topic nodes for layout
   */
  static buildTopicNodes(lesson: CurriculumLesson): Record<string, unknown>[] {
    const topics = Array.isArray(lesson.topics) ? lesson.topics : [];

    if (!topics.length) {
      return [
        {
          id: "topic-placeholder",
          role: "topic-placeholder",
          type: "placeholder",
          yoga: {
            flexDirection: "column",
            width: { unit: "percent", value: 100 },
          },
          data: {
            message: "No topics defined for this lesson.",
          },
        },
      ];
    }

    return topics.map((topic, topicIndex) => {
      const objectives = Array.isArray(topic.objectives)
        ? topic.objectives
        : [];
      const tasks = Array.isArray(topic.tasks) ? topic.tasks : [];

      return {
        id: `lesson-topic-${topicIndex + 1}`,
        role: "lesson-topic",
        type: "topic",
        yoga: {
          flexDirection: "column",
          gap: 8,
          width: { unit: "percent", value: 100 },
        },
        data: {
          index: topicIndex + 1,
          title:
            typeof topic.title === "string" && topic.title.trim().length
              ? topic.title.trim()
              : `Topic ${topicIndex + 1}`,
          objectives,
          tasks,
        },
      };
    });
  }
}

