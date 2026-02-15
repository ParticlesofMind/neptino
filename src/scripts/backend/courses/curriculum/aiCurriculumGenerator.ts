/**
 * AI Curriculum Generator
 * Uses on-device LLM to generate curriculum content based on course context.
 *
 * Context gathering has been partially extracted into CourseContextService
 * (see ../context/CourseContextService.ts). This class can optionally reuse
 * the shared fingerprint via `gatherContextFromService()` or keep using its
 * own `gatherContext()` which queries Supabase directly.
 */

import { modelManager } from '../../../../machine-learning/ModelManager';
import type { 
  CurriculumModule, 
  CurriculumLesson, 
  CurriculumTopic 
} from './curriculumManager';
import { supabase } from '../../supabase';
import { courseContextService } from '../context/CourseContextService';

/**
 * AI-specific context shape. Extends the shared fingerprint with fields
 * the LLM prompt needs (teacher name, existing curriculum for delta gen).
 */
interface CourseContext {
  // Required/Mandatory
  courseName: string;
  courseDescription: string;
  teacher: string;
  institution: string;
  language: string;
  classification: {
    classYear?: string;
    domain?: string;
    subject?: string;
    topic?: string;
  };
  pedagogy: {
    x: number;
    y: number;
    approach: string;
  } | null;

  // Optional
  schedule?: {
    lessonDuration?: number;
    totalLessons?: number;
    totalModules?: number;
  };
  structure?: {
    topicsPerLesson?: number;
    objectivesPerTopic?: number;
    tasksPerObjective?: number;
  };
  existingCurriculum?: {
    modules?: CurriculumModule[];
    lessons?: CurriculumLesson[];
  };
}

interface GenerationOptions {
  target: 'all' | 'modules' | 'lessons' | 'topics' | 'objectives' | 'tasks';
  context: CourseContext;
  includeSchedule: boolean;
  includeStructure: boolean;
  includeExisting: boolean;
}

export interface GenerationProgress {
  status: string;
  progress: number;
  stage?: string;
}

export class AICurriculumGenerator {
  private courseId: string;
  private progressCallback?: (progress: GenerationProgress) => void;

  constructor(courseId: string) {
    this.courseId = courseId;
  }

  /**
   * Set progress callback for UI updates
   */
  public onProgress(callback: (progress: GenerationProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Report progress to UI
   */
  private reportProgress(status: string, progress: number, stage?: string): void {
    if (this.progressCallback) {
      this.progressCallback({ status, progress, stage });
    }
  }

  /**
   * Gather course context from database
   */
  public async gatherContext(options: {
    includeSchedule: boolean;
    includeStructure: boolean;
    includeExisting: boolean;
  }): Promise<CourseContext | null> {
    try {
      this.reportProgress('Gathering course context...', 10);

      const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', this.courseId)
        .single();

      if (error || !course) {
        console.error('Failed to fetch course:', error);
        return null;
      }

      // Get teacher info
      const { data: teacher } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', course.teacher_id)
        .single();

      const teacherName = teacher 
        ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim()
        : 'Unknown Teacher';

      // Build context
      const context: CourseContext = {
        courseName: course.course_name || '',
        courseDescription: course.course_description || '',
        teacher: teacherName,
        institution: course.institution || '',
        language: course.course_language || 'English',
        classification: course.classification_data || {},
        pedagogy: course.course_pedagogy || null,
      };

      // Add optional context
      if (options.includeSchedule && course.schedule_settings) {
        // Get actual counts from curriculum_data
        const lessonsCount = course.curriculum_data?.lessons?.length || 0;
        const modulesCount = course.curriculum_data?.modules?.length || 0;
        
        context.schedule = {
          lessonDuration: course.schedule_settings.class_duration,
          totalLessons: lessonsCount,
          totalModules: modulesCount, // Add modules count
        };
      }

      if (options.includeStructure && course.curriculum_data?.structure) {
        context.structure = {
          topicsPerLesson: course.curriculum_data.structure.topicsPerLesson,
          objectivesPerTopic: course.curriculum_data.structure.objectivesPerTopic,
          tasksPerObjective: course.curriculum_data.structure.tasksPerObjective,
        };
      }

      if (options.includeExisting && course.curriculum_data) {
        context.existingCurriculum = {
          modules: course.curriculum_data.modules,
          lessons: course.curriculum_data.lessons,
        };
      }

      this.reportProgress('Context gathered', 20);
      return context;
    } catch (error) {
      console.error('Error gathering context:', error);
      return null;
    }
  }

  /**
   * Build a CourseContext from the shared CourseContextService fingerprint.
   * Falls back to gatherContext() if the fingerprint isn't populated.
   *
   * This lets callers avoid a redundant Supabase fetch when the fingerprint
   * is already warm (e.g., the teacher just finished filling in setup panels).
   */
  public async gatherContextFromService(options: {
    includeSchedule: boolean;
    includeStructure: boolean;
    includeExisting: boolean;
  }): Promise<CourseContext | null> {
    // Ensure fingerprint is up-to-date
    if (courseContextService.getCourseId() !== this.courseId) {
      await courseContextService.refreshFromCourse(this.courseId);
    }

    const fp = courseContextService.getFingerprint();
    if (!fp.courseId) {
      // Service couldn't load — fall back to direct query
      return this.gatherContext(options);
    }

    const context: CourseContext = {
      courseName: fp.courseName,
      courseDescription: fp.courseDescription,
      teacher: '', // fingerprint doesn't carry teacher name; we'll fetch it
      institution: fp.institution,
      language: fp.language,
      classification: {
        classYear: fp.classification.classYear,
        domain: fp.classification.domain,
        subject: fp.classification.subject,
        topic: fp.classification.topic,
      },
      pedagogy: fp.pedagogyCoordinates
        ? { x: fp.pedagogyCoordinates.x, y: fp.pedagogyCoordinates.y, approach: fp.instructionalApproach }
        : null,
    };

    if (options.includeSchedule && fp.schedule) {
      const totalLessons = fp.modules.reduce((sum, m) => sum + m.lessons.length, 0);
      context.schedule = {
        lessonDuration: fp.schedule.lessonDuration,
        totalLessons,
        totalModules: fp.modules.length,
      };
    }

    if (options.includeStructure) {
      context.structure = { ...fp.structureConfig };
    }

    // existingCurriculum still needs the raw Supabase data (lesson objects
    // with nested topics/objectives/tasks), which the fingerprint summarizes
    // but doesn't store verbatim. Fall back to a targeted fetch.
    if (options.includeExisting) {
      try {
        const { data: course } = await supabase
          .from('courses')
          .select('curriculum_data')
          .eq('id', this.courseId)
          .single();
        if (course?.curriculum_data) {
          context.existingCurriculum = {
            modules: course.curriculum_data.modules,
            lessons: course.curriculum_data.lessons,
          };
        }
      } catch { /* non-critical */ }
    }

    // Fetch teacher name (lightweight query)
    try {
      const { data: course } = await supabase
        .from('courses')
        .select('teacher_id')
        .eq('id', this.courseId)
        .single();
      if (course?.teacher_id) {
        const { data: teacher } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', course.teacher_id)
          .single();
        context.teacher = teacher
          ? `${teacher.first_name ?? ''} ${teacher.last_name ?? ''}`.trim()
          : 'Unknown Teacher';
      }
    } catch { /* non-critical */ }

    return context;
  }

  /**
   * Build prompt for AI generation
   */
  private buildPrompt(target: string, context: CourseContext, existingData?: any): string {
    let prompt = `You are an expert curriculum designer helping create educational content.\n\n`;

    // Add mandatory context
    prompt += `COURSE INFORMATION:\n`;
    prompt += `- Name: ${context.courseName}\n`;
    prompt += `- Description: ${context.courseDescription}\n`;
    prompt += `- Teacher: ${context.teacher}\n`;
    prompt += `- Institution: ${context.institution}\n`;
    prompt += `- Language: ${context.language}\n\n`;

    if (context.classification.subject) {
      prompt += `CLASSIFICATION:\n`;
      prompt += `- Year Level: ${context.classification.classYear || 'Not specified'}\n`;
      prompt += `- Domain: ${context.classification.domain || 'Not specified'}\n`;
      prompt += `- Subject: ${context.classification.subject}\n`;
      prompt += `- Topic: ${context.classification.topic || 'General'}\n\n`;
    }

    if (context.pedagogy) {
      prompt += `PEDAGOGICAL APPROACH:\n`;
      prompt += `- Teaching Style: ${context.pedagogy.approach}\n`;
      prompt += `- Coordinates: (${context.pedagogy.x}, ${context.pedagogy.y})\n\n`;
    }

    // Add optional context
    if (context.schedule) {
      prompt += `SCHEDULE:\n`;
      prompt += `- Lesson Duration: ${context.schedule.lessonDuration} minutes\n`;
      prompt += `- Total Lessons: ${context.schedule.totalLessons}\n`;
      prompt += `- Total Modules: ${context.schedule.totalModules || 0}\n\n`;
    }

    if (context.structure) {
      prompt += `CONTENT STRUCTURE:\n`;
      prompt += `- Topics per Lesson: ${context.structure.topicsPerLesson}\n`;
      prompt += `- Objectives per Topic: ${context.structure.objectivesPerTopic}\n`;
      prompt += `- Tasks per Objective: ${context.structure.tasksPerObjective}\n\n`;
    }

    // Task-specific prompts
    switch (target) {
      case 'all':
        prompt += this.buildAllPrompt(context);
        break;
      case 'modules':
        prompt += this.buildModulesPrompt(context, existingData);
        break;
      case 'lessons':
        prompt += this.buildLessonsPrompt(context, existingData);
        break;
      case 'topics':
        prompt += this.buildTopicsPrompt(context, existingData);
        break;
      case 'objectives':
        prompt += this.buildObjectivesPrompt(context, existingData);
        break;
      case 'tasks':
        prompt += this.buildTasksPrompt(context, existingData);
        break;
    }

    return prompt;
  }

  private buildAllPrompt(context: CourseContext): string {
    let prompt = `TASK: Generate a complete curriculum structure.\n\n`;
    
    if (context.schedule?.totalLessons) {
      prompt += `Generate ${context.schedule.totalLessons} lesson titles that:\n`;
    } else {
      prompt += `Generate lesson titles that:\n`;
    }
    
    prompt += `1. Follow a logical progression\n`;
    prompt += `2. Match the course description and subject\n`;
    prompt += `3. Are clear and descriptive\n`;
    prompt += `4. Appropriate for ${context.classification.classYear || 'the target audience'}\n\n`;
    
    if (context.structure) {
      prompt += `For each lesson, generate:\n`;
      prompt += `- ${context.structure.topicsPerLesson} topic titles\n`;
      prompt += `- ${context.structure.objectivesPerTopic} learning objectives per topic\n`;
      prompt += `- ${context.structure.tasksPerObjective} practical tasks per objective\n\n`;
    }

    prompt += `Format: Return ONLY a JSON array with this structure:\n`;
    prompt += `[\n`;
    prompt += `  {\n`;
    prompt += `    "lessonNumber": 1,\n`;
    prompt += `    "title": "Lesson title",\n`;
    prompt += `    "topics": [\n`;
    prompt += `      {\n`;
    prompt += `        "title": "Topic title",\n`;
    prompt += `        "objectives": ["Objective 1", "Objective 2"],\n`;
    prompt += `        "tasks": ["Task 1", "Task 2"]\n`;
    prompt += `      }\n`;
    prompt += `    ]\n`;
    prompt += `  }\n`;
    prompt += `]\n\n`;
    prompt += `Do not include any markdown formatting, code blocks, or explanatory text. Return only the JSON array.`;

    return prompt;
  }

  private buildModulesPrompt(context: CourseContext, modules?: CurriculumModule[]): string {
    // For small models, use a simpler, more direct prompt
    const numModules = modules?.length || context.schedule?.totalModules || 3;
    const courseName = context.courseName;
    const subject = context.classification.subject || 'General';
    
    let prompt = `Course: ${courseName}\nSubject: ${subject}\n\n`;
    prompt += `Module titles as JSON array:\n[`;
    
    // Give the model a starting template to complete
    for (let i = 0; i < numModules; i++) {
      if (i > 0) prompt += ',';
      prompt += `"`;
    }

    return prompt;
  }

  private buildLessonsPrompt(_context: CourseContext, lessons?: CurriculumLesson[]): string {
    let prompt = `Generate ${lessons?.length || 10} lesson titles as a JSON array.\n\n`;

    prompt += `Course: ${_context.courseName}\n`;
    prompt += `Subject: ${_context.classification.subject || 'General'}\n\n`;

    prompt += `Requirements:\n`;
    prompt += `- Each title should be clear and descriptive\n`;
    prompt += `- Follow a logical progression\n`;
    prompt += `- Appropriate for ${_context.classification.classYear || 'students'}\n\n`;

    prompt += `IMPORTANT: Return ONLY a valid JSON array like this:\n`;
    prompt += `["Introduction to the Topic", "Basic Concepts", "Advanced Techniques"]\n\n`;
    prompt += `Start your response with [ and end with ]. No explanations, no markdown.\n\n`;
    prompt += `JSON array:\n`;

    return prompt;
  }

  private buildTopicsPrompt(context: CourseContext, lessons?: CurriculumLesson[]): string {
    let prompt = `TASK: Generate topic titles for each lesson.\n\n`;

    if (lessons && lessons.length > 0) {
      prompt += `Generate ${context.structure?.topicsPerLesson || 2} topic titles per lesson.\n\n`;
      prompt += `Lessons:\n`;
      lessons.slice(0, 5).forEach((lesson, idx) => {
        prompt += `${idx + 1}. ${lesson.title || `Lesson ${idx + 1}`}\n`;
      });
      prompt += `\n`;
    }

    prompt += `Format: Return ONLY a JSON array matching lessons:\n`;
    prompt += `[\n`;
    prompt += `  ["Topic 1 for Lesson 1", "Topic 2 for Lesson 1"],\n`;
    prompt += `  ["Topic 1 for Lesson 2", "Topic 2 for Lesson 2"]\n`;
    prompt += `]\n\n`;
    prompt += `Do not include any markdown formatting or code blocks.`;

    return prompt;
  }

  private buildObjectivesPrompt(context: CourseContext, lessons?: CurriculumLesson[]): string {
    let prompt = `TASK: Generate learning objectives for each topic.\n\n`;

    prompt += `Learning objectives should:\n`;
    prompt += `1. Start with measurable verbs (understand, apply, analyze, create)\n`;
    prompt += `2. Be specific and achievable\n`;
    prompt += `3. Match the topic content\n`;
    prompt += `4. Be appropriate for ${context.classification.classYear || 'the audience'}\n\n`;

    if (lessons && lessons.length > 0) {
      prompt += `Sample topics:\n`;
      const samplesWithTopics = lessons
        .filter(l => l.topics && l.topics.length > 0)
        .slice(0, 3);
      
      samplesWithTopics.forEach((lesson) => {
        prompt += `Lesson: ${lesson.title}\n`;
        lesson.topics.forEach((topic: CurriculumTopic, tIdx: number) => {
          prompt += `  Topic ${tIdx + 1}: ${topic.title || 'Untitled'}\n`;
        });
      });
      prompt += `\n`;
    }

    prompt += `Format: Return ONLY a JSON array structured by lesson and topic:\n`;
    prompt += `[\n`;
    prompt += `  [ // Lesson 1\n`;
    prompt += `    ["Objective 1", "Objective 2"], // Topic 1\n`;
    prompt += `    ["Objective 1", "Objective 2"]  // Topic 2\n`;
    prompt += `  ]\n`;
    prompt += `]\n\n`;
    prompt += `Do not include any markdown formatting or code blocks.`;

    return prompt;
  }

  private buildTasksPrompt(_context: CourseContext, lessons?: CurriculumLesson[]): string {
    let prompt = `TASK: Generate practical tasks for each learning objective.\n\n`;

    prompt += `Tasks should:\n`;
    prompt += `1. Be actionable and specific\n`;
    prompt += `2. Help students practice the objective\n`;
    prompt += `3. Be achievable within lesson timeframe\n`;
    prompt += `4. Vary in format (exercises, projects, discussions)\n\n`;

    if (lessons && lessons.length > 0) {
      prompt += `Sample objectives:\n`;
      const samplesWithObjectives = lessons
        .filter(l => l.topics && l.topics.some((t: CurriculumTopic) => t.objectives.length > 0))
        .slice(0, 2);
      
      samplesWithObjectives.forEach((lesson) => {
        prompt += `Lesson: ${lesson.title}\n`;
        lesson.topics.slice(0, 2).forEach((topic: CurriculumTopic) => {
          prompt += `  Topic: ${topic.title || 'Untitled'}\n`;
          topic.objectives.slice(0, 2).forEach((obj: string, oIdx: number) => {
            prompt += `    Objective ${oIdx + 1}: ${obj || 'Untitled'}\n`;
          });
        });
      });
      prompt += `\n`;
    }

    prompt += `Format: Return ONLY a JSON array structured by lesson, topic, and objective:\n`;
    prompt += `[\n`;
    prompt += `  [ // Lesson 1\n`;
    prompt += `    [ // Topic 1\n`;
    prompt += `      ["Task 1", "Task 2"], // Objective 1\n`;
    prompt += `      ["Task 1", "Task 2"]  // Objective 2\n`;
    prompt += `    ]\n`;
    prompt += `  ]\n`;
    prompt += `]\n\n`;
    prompt += `Do not include any markdown formatting or code blocks.`;

    return prompt;
  }

  /**
   * Generate fallback content when AI fails to produce valid output
   */
  private generateFallbackContent(target: string, context: CourseContext): any {
    const courseName = context.courseName || 'Course';
    const numLessons = context.schedule?.totalLessons || 10;
    const numModules = context.schedule?.totalModules || 0;
    
    switch (target) {
      case 'lessons':
        return Array.from({ length: numLessons }, (_, i) => `${courseName} - Lesson ${i + 1}`);
      
      case 'modules': {
        // Use existing module count, or calculate from lessons
        const moduleCount = numModules > 0 ? numModules : Math.ceil(numLessons / 3);
        return Array.from({ length: moduleCount }, (_, i) => `Module ${i + 1}: ${courseName}`);
      }
      
      case 'topics': {
        const topicsPerLesson = context.structure?.topicsPerLesson || 2;
        return Array.from({ length: numLessons }, () => 
          Array.from({ length: topicsPerLesson }, (_, i) => `Topic ${i + 1}`)
        );
      }
      
      case 'objectives': {
        const objPerTopic = context.structure?.objectivesPerTopic || 2;
        const topicsCount = context.structure?.topicsPerLesson || 2;
        return Array.from({ length: numLessons }, () =>
          Array.from({ length: topicsCount }, () =>
            Array.from({ length: objPerTopic }, (_, i) => `Learning Objective ${i + 1}`)
          )
        );
      }
      
      case 'tasks': {
        const tasksPerObj = context.structure?.tasksPerObjective || 2;
        const objCount = context.structure?.objectivesPerTopic || 2;
        const topCount = context.structure?.topicsPerLesson || 2;
        return Array.from({ length: numLessons }, () =>
          Array.from({ length: topCount }, () =>
            Array.from({ length: objCount }, () =>
              Array.from({ length: tasksPerObj }, (_, i) => `Practice Task ${i + 1}`)
            )
          )
        );
      }
      
      case 'all': {
        // Generate a simple curriculum structure
        const topics = context.structure?.topicsPerLesson || 2;
        const objectives = context.structure?.objectivesPerTopic || 2;
        const tasks = context.structure?.tasksPerObjective || 2;
        
        return Array.from({ length: numLessons }, (_, lessonIdx) => ({
          lessonNumber: lessonIdx + 1,
          title: `${courseName} - Lesson ${lessonIdx + 1}`,
          topics: Array.from({ length: topics }, (_, topicIdx) => ({
            title: `Topic ${topicIdx + 1}`,
            objectives: Array.from({ length: objectives }, (_, objIdx) => 
              `Learning Objective ${objIdx + 1}`
            ),
            tasks: Array.from({ length: objectives * tasks }, (_, taskIdx) =>
              `Practice Task ${taskIdx + 1}`
            ),
          })),
        }));
      }
      
      default:
        return [];
    }
  }

  /**
   * Clean and parse LLM response
   */
  private cleanAndParseResponse(response: string): any {
    try {
      // Remove markdown code blocks
      let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Remove any leading/trailing whitespace
      cleaned = cleaned.trim();

      // Find JSON array or object - look for the first [ or {
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      const objectMatch = cleaned.match(/\{[\s\S]*\}/);
      
      if (arrayMatch) {
        cleaned = arrayMatch[0];
      } else if (objectMatch) {
        cleaned = objectMatch[0];
      }

      // Try to parse JSON
      const parsed = JSON.parse(cleaned);
      
      // Validate that we got something useful
      if (parsed === null || parsed === undefined) {
        throw new Error('Parsed result is null or undefined');
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.log('Raw response:', response);
      console.log('Response length:', response.length);
      console.log('First 500 chars:', response.substring(0, 500));
      
      // Provide user-friendly error with suggestions
      throw new Error(
        'The AI model produced output that could not be parsed. This can happen with smaller models. ' +
        'Try: (1) Using a smaller target like "Generate Lesson Names" instead of "Generate All", ' +
        'or (2) Adding a Hugging Face token to use a better model (see README).'
      );
    }
  }

  /**
   * Generate curriculum content using AI
   */
  public async generate(options: GenerationOptions): Promise<any> {
    try {
      // Initialize model if needed
      this.reportProgress('Initializing AI model...', 0);
      
      const phi3 = modelManager.getPhi3Model();
      if (!phi3.isReady()) {
        await phi3.load(undefined, (progress) => {
          this.reportProgress(`Loading model: ${progress.status}`, progress.progress || 0);
        });
      }

      this.reportProgress('Model ready, generating content...', 40);

      // Gather existing data based on target
      let existingData;
      if (options.context.existingCurriculum) {
        switch (options.target) {
          case 'modules':
            existingData = options.context.existingCurriculum.modules;
            break;
          case 'lessons':
          case 'topics':
          case 'objectives':
          case 'tasks':
            existingData = options.context.existingCurriculum.lessons;
            break;
        }
      }

      // Build prompt
      const prompt = this.buildPrompt(options.target, options.context, existingData);
      
      console.log('🤖 AI Prompt:', prompt);

      // Generate content
      this.reportProgress('Generating content...', 60);
      
      const result = await phi3.generate(prompt, {
        maxNewTokens: 1024,
        temperature: 0.3, // Lower temperature for more focused output
        topP: 0.95,
        repetitionPenalty: 1.2,
      });

      console.log('🤖 Raw AI Response:', result.text);
      console.log('🤖 Response length:', result.text?.length || 0);
      console.log('🤖 First 500 chars:', result.text?.substring(0, 500));

      this.reportProgress('Processing response...', 90);

      // Parse and validate response
      let generatedContent;
      let usedFallback = false;
      try {
        console.log('🧹 Attempting to parse response...');
        generatedContent = this.cleanAndParseResponse(result.text);
        console.log('✅ Successfully parsed:', generatedContent);
      } catch (parseError) {
        // If parsing fails, provide helpful mock data instead of failing completely
        console.warn('AI generation produced unparseable output, using template data');
        generatedContent = this.generateFallbackContent(options.target, options.context);
        usedFallback = true;
        
        // Update status to indicate we used fallback
        this.reportProgress('Using template data (AI output was invalid)', 100);
        
        // Wait a bit so user sees the message
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log('✅ Generated content:', generatedContent);
      
      if (!usedFallback) {
        this.reportProgress('Content generated successfully!', 100);
      }

      return generatedContent;
    } catch (error) {
      console.error('Generation error:', error);
      this.reportProgress('Generation failed', 0);
      throw error;
    }
  }
}
