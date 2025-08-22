import { supabase } from "../../backend/supabase.js";

interface CurriculumLesson {
 lessonNumber: number;
 title: string;
 topics: CurriculumTopic[];
}

interface CurriculumTopic {
 title: string;
 objectives: string[];
 tasks: string[];
}

interface ContentLoadConfig {
 type: "mini" | "single" | "double" | "triple" | "halfFull";
 duration: number; // in minutes
 topicsPerLesson: number;
 objectivesPerTopic: number;
 tasksPerTopic: number;
 isRecommended: boolean;
 recommendationText: string;
}

interface DurationPreset {
  type: "mini" | "single" | "double" | "triple" | "halfFull";
  maxDuration: number;
  defaultTopics: number;
  defaultObjectives: number;
  defaultTasks: number;
  rationale: string;
}

type PreviewMode = "titles" | "topics" | "objectives" | "all";

class CurriculumManager {
 private courseId: string;
 private curriculumConfigSection!: HTMLElement;
 private curriculumPreviewSection!: HTMLElement;
 private currentCurriculum: CurriculumLesson[] = [];
 private contentLoadConfig: ContentLoadConfig | null = null;
 private currentPreviewMode: PreviewMode = "all";
 private scheduledLessonDuration: number = 0; // Store the actual scheduled duration
 private saveTimeout: number | null = null; // For debouncing saves

 // Duration presets with default values and rationale
 private readonly durationPresets: Record<string, DurationPreset> = {
   mini: {
     type: "mini",
     maxDuration: 30,
     defaultTopics: 1,
     defaultObjectives: 1,
     defaultTasks: 2,
     rationale: "Mini lessons need tight focus. One clear learning objective with just enough practice to check understanding."
   },
   single: {
     type: "single", 
     maxDuration: 60,
     defaultTopics: 2,
     defaultObjectives: 2,
     defaultTasks: 2,
     rationale: "Standard lesson length allows for two related concepts, each with paired objectives and sufficient practice."
   },
   double: {
     type: "double",
     maxDuration: 120,
     defaultTopics: 3,
     defaultObjectives: 2,
     defaultTasks: 3,
     rationale: "Extended time allows deeper exploration but requires consolidation breaks. Three topics prevent cognitive overload while allowing meaningful depth."
   },
   triple: {
     type: "triple",
     maxDuration: 180,
     defaultTopics: 4,
     defaultObjectives: 2,
     defaultTasks: 3,
     rationale: "Very long sessions need structured variety. Four topics with regular consolidation activities maintain engagement and retention."
   },
   halfFull: {
     type: "halfFull",
     maxDuration: 999,
     defaultTopics: 5,
     defaultObjectives: 3,
     defaultTasks: 4,
     rationale: "Extended sessions can cover more ground but must include multiple consolidation periods, breaks, and varied activities to maintain effectiveness."
   }
 };

 constructor(courseId?: string) {
   // Get course ID from parameter, URL, or session storage
   this.courseId = courseId || this.getCourseId();
   
   // Load saved preview mode from localStorage
   this.currentPreviewMode = this.getStoredPreviewMode();

   console.log('📚 CurriculumManager initializing with course ID:', this.courseId);

 if (!this.courseId) {
 console.warn("⚠️ No course ID available for curriculum management - some features may be limited");
 // Still initialize elements and basic functionality
 this.initializeElements();
 this.bindEvents();
 return;
 }

 this.initializeElements();
 this.bindEvents();
 this.initializeCurriculum();
 }

 private getCourseId(): string {
 // First try to get course ID from URL parameters
 const urlParams = new URLSearchParams(window.location.search);
 const courseIdFromUrl = urlParams.get('courseId') || urlParams.get('id');
 
 if (courseIdFromUrl) {
 console.log('📚 Course ID from URL:', courseIdFromUrl);
 return courseIdFromUrl;
 }

 // Fallback to session storage (for backward compatibility)
 const courseIdFromSession = sessionStorage.getItem("currentCourseId");
 if (courseIdFromSession) {
 console.log('📚 Course ID from session storage:', courseIdFromSession);
 return courseIdFromSession;
 }

 console.log('📚 No course ID found for curriculum manager');
 return "";
 }

 private async initializeCurriculum(): Promise<void> {
 try {
 // Load schedule data first
 await this.loadScheduleData();

 // Load existing curriculum
 await this.loadExistingCurriculum();

 // Auto-generate curriculum if we have schedule data but no curriculum
 if (!this.currentCurriculum.length && this.contentLoadConfig) {
 await this.generateCurriculum();
 }

 // Always show preview if we have curriculum data
 if (this.currentCurriculum.length > 0) {
 this.showPreview();
 }
 } catch (error) {
 console.error("Error initializing curriculum:", error);
 }
 }

 private getStoredPreviewMode(): PreviewMode {
   const stored = localStorage.getItem('curriculum-preview-mode');
   const validModes: PreviewMode[] = ["titles", "topics", "objectives", "all"];
   
   if (stored && validModes.includes(stored as PreviewMode)) {
     return stored as PreviewMode;
   }
   
   return "all"; // default fallback
 }

 private savePreviewMode(mode: PreviewMode): void {
   localStorage.setItem('curriculum-preview-mode', mode);
 }

  private initializeElements(): void {
    this.curriculumConfigSection = document.querySelector(
      ".curriculum__config",
    ) as HTMLElement;
    this.curriculumPreviewSection = document.querySelector(
      ".curriculum__preview",
    ) as HTMLElement;
    
    // Check if all elements were found
    if (!this.curriculumConfigSection) {
      console.error("curriculum__config element not found");
      return;
    }
    if (!this.curriculumPreviewSection) {
      console.error("curriculum__preview element not found");
      return;
    }
    
    // Set initial active button for preview mode
    this.setInitialActiveButton();
  }

  private setInitialActiveButton(): void {
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
      console.log('🎯 Setting initial active button for mode:', this.currentPreviewMode);
      const previewModeButtons = this.curriculumPreviewSection?.querySelectorAll('button[data-mode]');
      console.log('🔘 Found buttons for initial setup:', previewModeButtons?.length);
      
      previewModeButtons?.forEach((btn) => {
        btn.classList.remove('button--active');
        if (btn.getAttribute('data-mode') === this.currentPreviewMode) {
          btn.classList.add('button--active');
          console.log('✅ Set initial active class on button:', btn.textContent?.trim());
        }
      });
    }, 100);
  }

 private bindEvents(): void {
   if (!this.curriculumConfigSection) {
     console.error("Cannot bind events: required elements not found");
     return;
   }

   // Preview mode buttons
   const previewModeButtons =
     this.curriculumPreviewSection?.querySelectorAll('button[data-mode]');
   previewModeButtons?.forEach((button) => {
     button.addEventListener("click", (e) => {
       const mode = (e.target as HTMLElement).dataset.mode as PreviewMode;
       this.setPreviewMode(mode);
     });
   });

 } private async loadScheduleData(): Promise<void> {
 if (!this.courseId) {
 console.warn('📚 Cannot load schedule data: no course ID available');
 this.displayNoScheduleWarning();
 return;
 }

 try {
 const { data, error } = await supabase
 .from("courses")
 .select("schedule_settings")
 .eq("id", this.courseId)
 .single();

 if (error) throw error;

 if (
 data?.schedule_settings &&
 Array.isArray(data.schedule_settings) &&
 data.schedule_settings.length > 0
 ) {
 // Get the first lesson to determine duration
 const firstLesson = data.schedule_settings[0];
 const duration = this.calculateLessonDuration(
 firstLesson.startTime,
 firstLesson.endTime,
 );
 this.contentLoadConfig = this.determineContentLoad(duration);
 this.displayContentLoad();
 } else {
 this.displayNoScheduleWarning();
 }
 } catch (error) {
 console.error("Error loading schedule data:", error);
 this.displayNoScheduleWarning();
 }
 }

 private calculateLessonDuration(startTime: string, endTime: string): number {
 const start = new Date(`2000-01-01T${startTime}`);
 const end = new Date(`2000-01-01T${endTime}`);
 return Math.abs(end.getTime() - start.getTime()) / (1000 * 60); // Convert to minutes
 }

 private determineContentLoad(duration: number): ContentLoadConfig {
   this.scheduledLessonDuration = duration;
   
   let selectedPreset: DurationPreset;
   let isRecommended = true;
   let recommendationText = "Recommended";
   
   if (duration <= 30) {
     selectedPreset = this.durationPresets.mini;
   } else if (duration <= 60) {
     selectedPreset = this.durationPresets.single;
   } else if (duration <= 120) {
     selectedPreset = this.durationPresets.double;
   } else if (duration <= 180) {
     selectedPreset = this.durationPresets.triple;
   } else {
     selectedPreset = this.durationPresets.halfFull;
   }

   return {
     type: selectedPreset.type,
     duration,
     topicsPerLesson: selectedPreset.defaultTopics,
     objectivesPerTopic: selectedPreset.defaultObjectives,
     tasksPerTopic: selectedPreset.defaultTasks,
     isRecommended,
     recommendationText
   };
 }

 private displayContentLoad(): void {
   if (!this.contentLoadConfig) return;

   // Setup the duration configuration immediately
   this.setupDurationConfiguration();
 }

 private setupDurationConfiguration(): void {
   const durationOptions = document.querySelectorAll('button[data-duration]');
   const recommendationElement = document.getElementById('curriculum-recommendation');
   const topicsInput = document.getElementById('curriculum-topics') as HTMLInputElement;
   const objectivesInput = document.getElementById('curriculum-objectives') as HTMLInputElement;
   const tasksInput = document.getElementById('curriculum-tasks') as HTMLInputElement;

   if (!recommendationElement || !topicsInput || !objectivesInput || !tasksInput) {
     console.error('Duration configuration elements not found');
     return;
   }

   // Set up click handlers for duration options
   durationOptions.forEach(option => {
     const button = option as HTMLButtonElement;
     const durationType = button.dataset.duration as keyof typeof this.durationPresets;
     
     button.addEventListener('click', () => {
       console.log('👆 User clicked duration button:', durationType);
       
       // Remove active class from all options
       durationOptions.forEach(opt => {
         opt.classList.remove('button--primary');
       });
       
       // Add active class to clicked option
       button.classList.add('button--primary');
       
       // Update configuration based on selection
       this.updateConfigurationFromSelection(durationType, recommendationElement);
       
       // Update input values and regenerate curriculum (only for user clicks)
       const preset = this.durationPresets[durationType];
       topicsInput.value = preset.defaultTopics.toString();
       objectivesInput.value = preset.defaultObjectives.toString();
       tasksInput.value = preset.defaultTasks.toString();
       
       // Update content load config
       this.contentLoadConfig = {
         type: preset.type,
         duration: this.scheduledLessonDuration,
         topicsPerLesson: preset.defaultTopics,
         objectivesPerTopic: preset.defaultObjectives,
         tasksPerTopic: preset.defaultTasks,
         isRecommended: this.isRecommendedDuration(durationType, this.scheduledLessonDuration),
         recommendationText: this.getRecommendationText(durationType, this.scheduledLessonDuration)
       };
       
       console.log('🎯 User selected preset, updating inputs and regenerating curriculum');
       // Regenerate and save curriculum with new structure
       this.regenerateAndSaveCurriculum();
     });
   });

   // Set up input change handlers to update curriculum in real-time
   [topicsInput, objectivesInput, tasksInput].forEach(input => {
     // Use 'input' event for real-time updates as user types
     input.addEventListener('input', () => {
       this.handleInputChange(topicsInput, objectivesInput, tasksInput);
     });
     
     // Also listen for 'change' event for when user tabs out
     input.addEventListener('change', () => {
       this.handleInputChange(topicsInput, objectivesInput, tasksInput);
     });
   });

   // Auto-select the recommended duration option (but don't override existing curriculum structure)
   this.autoSelectRecommendedDuration();
   
   // Populate inputs with current curriculum structure if it exists (this should override defaults)
   this.populateInputsFromExistingCurriculum();
 }

 private populateInputsFromExistingCurriculum(): void {
   const topicsInput = document.getElementById('curriculum-topics') as HTMLInputElement;
   const objectivesInput = document.getElementById('curriculum-objectives') as HTMLInputElement;
   const tasksInput = document.getElementById('curriculum-tasks') as HTMLInputElement;

   if (!topicsInput || !objectivesInput || !tasksInput) {
     console.log('📝 Input elements not found for population');
     return;
   }

   // If we have existing curriculum data, use its structure
   if (this.currentCurriculum && this.currentCurriculum.length > 0) {
     const firstLesson = this.currentCurriculum[0];
     if (firstLesson && firstLesson.topics && firstLesson.topics.length > 0) {
       const topicsCount = firstLesson.topics.length;
       const objectivesCount = firstLesson.topics[0].objectives ? firstLesson.topics[0].objectives.length : 2;
       const tasksCount = firstLesson.topics[0].tasks ? firstLesson.topics[0].tasks.length : 2;

       topicsInput.value = topicsCount.toString();
       objectivesInput.value = objectivesCount.toString();
       tasksInput.value = tasksCount.toString();

       // Update content load config to match existing structure
       if (this.contentLoadConfig) {
         this.contentLoadConfig.topicsPerLesson = topicsCount;
         this.contentLoadConfig.objectivesPerTopic = objectivesCount;
         this.contentLoadConfig.tasksPerTopic = tasksCount;
         
         console.log('🔧 ContentLoadConfig updated from existing curriculum:', {
           topics: this.contentLoadConfig.topicsPerLesson,
           objectives: this.contentLoadConfig.objectivesPerTopic,
           tasks: this.contentLoadConfig.tasksPerTopic
         });
       }

       console.log('📚 Populated inputs from existing curriculum:', {
         topics: topicsCount,
         objectives: objectivesCount,
         tasks: tasksCount
       });
     }
   }
 }

 private handleInputChange(
   topicsInput: HTMLInputElement,
   objectivesInput: HTMLInputElement,
   tasksInput: HTMLInputElement
 ): void {
   if (!this.contentLoadConfig) return;

   // Clear any existing timeout
   if (this.saveTimeout) {
     clearTimeout(this.saveTimeout);
   }

   // Update the config immediately
   const topics = parseInt(topicsInput.value) || 1;
   const objectives = parseInt(objectivesInput.value) || 1;
   const tasks = parseInt(tasksInput.value) || 1;

   this.contentLoadConfig.topicsPerLesson = topics;
   this.contentLoadConfig.objectivesPerTopic = objectives;
   this.contentLoadConfig.tasksPerTopic = tasks;

   console.log('📝 Input values changed (before debounce):', {
     topics: this.contentLoadConfig.topicsPerLesson,
     objectives: this.contentLoadConfig.objectivesPerTopic,
     tasks: this.contentLoadConfig.tasksPerTopic
   });

   // Debounce the actual save operation
   this.saveTimeout = window.setTimeout(() => {
     console.log('⏱️ Debounce timeout expired, now saving...');
     this.regenerateAndSaveCurriculum();
   }, 500); // Wait 500ms after last change
 }

 private updateConfigurationFromSelection(
   durationType: keyof typeof this.durationPresets,
   recommendationElement: HTMLElement
 ): void {
   const isRecommended = this.isRecommendedDuration(durationType, this.scheduledLessonDuration);
   const recommendationText = this.getRecommendationText(durationType, this.scheduledLessonDuration);
   
   // Update recommendation text and styling
   recommendationElement.className = `curriculum__recommendation ${isRecommended ? 'curriculum__recommendation--recommended' : 'curriculum__recommendation--not-recommended'}`;
   recommendationElement.textContent = recommendationText;
 }

 private isRecommendedDuration(durationType: keyof typeof this.durationPresets, actualDuration: number): boolean {
   const preset = this.durationPresets[durationType];
   
   if (durationType === 'halfFull') {
     return actualDuration > 180;
   }
   
   const previousMaxDuration = this.getPreviousMaxDuration(durationType);
   return actualDuration > previousMaxDuration && actualDuration <= preset.maxDuration;
 }

 private getPreviousMaxDuration(durationType: keyof typeof this.durationPresets): number {
   switch (durationType) {
     case 'mini': return 0;
     case 'single': return 30;
     case 'double': return 60;
     case 'triple': return 120;
     case 'halfFull': return 180;
     default: return 0;
   }
 }

 private getRecommendationText(durationType: keyof typeof this.durationPresets, actualDuration: number): string {
   if (this.isRecommendedDuration(durationType, actualDuration)) {
     return "Recommended";
   }
   
   const preset = this.durationPresets[durationType];
   
   if (durationType === 'halfFull') {
     return actualDuration <= 180 ? "Not recommended: too short" : "Recommended";
   }
   
   const previousMaxDuration = this.getPreviousMaxDuration(durationType);
   
   if (actualDuration <= previousMaxDuration) {
     return "Not recommended: too short";
   } else if (actualDuration > preset.maxDuration) {
     return "Not recommended: too long";
   }
   
   return "Recommended";
 }

 private autoSelectRecommendedDuration(): void {
   if (this.scheduledLessonDuration <= 0) return;
   
   // Find the recommended duration type
   let recommendedType: keyof typeof this.durationPresets = 'single';
   
   if (this.scheduledLessonDuration <= 30) {
     recommendedType = 'mini';
   } else if (this.scheduledLessonDuration <= 60) {
     recommendedType = 'single';
   } else if (this.scheduledLessonDuration <= 120) {
     recommendedType = 'double';
   } else if (this.scheduledLessonDuration <= 180) {
     recommendedType = 'triple';
   } else {
     recommendedType = 'halfFull';
   }
   
   // Don't click the button - just set the visual state
   this.setDurationButtonVisualState(recommendedType);
 }

 private setDurationButtonVisualState(durationType: keyof typeof this.durationPresets): void {
   const durationOptions = document.querySelectorAll('button[data-duration]');
   const recommendationElement = document.getElementById('curriculum-recommendation');
   
   if (!recommendationElement) return;

   // Remove active class from all options
   durationOptions.forEach(opt => {
     opt.classList.remove('button--primary');
   });
   
   // Find and activate the correct button
   const targetButton = document.querySelector(`[data-duration="${durationType}"]`) as HTMLButtonElement;
   if (targetButton) {
     targetButton.classList.add('button--primary');
     
     // Update configuration based on selection (visual only, don't update inputs)
     this.updateConfigurationFromSelection(durationType, recommendationElement);
   }
 }

 private displayNoScheduleWarning(): void {
   // Just show the setup configuration without a warning
   this.setupDurationConfiguration();
 } private async regenerateAndSaveCurriculum(): Promise<void> {
   if (!this.contentLoadConfig) {
     console.warn("Content load configuration not available.");
     return;
   }

   if (!this.courseId) {
     console.warn("No course ID available for curriculum regeneration.");
     return;
   }

   try {
     console.log('🔄 Regenerating curriculum with new structure:', {
       topics: this.contentLoadConfig.topicsPerLesson,
       objectives: this.contentLoadConfig.objectivesPerTopic,
       tasks: this.contentLoadConfig.tasksPerTopic
     });
     
     // Double-check the content load config values
     console.log('🔍 Current contentLoadConfig object:', JSON.stringify(this.contentLoadConfig, null, 2));

     // Get the number of lessons from schedule
     const { data: scheduleData } = await supabase
       .from("courses")
       .select("schedule_settings, course_sessions")
       .eq("id", this.courseId)
       .single();

     const numLessons = scheduleData?.course_sessions || 1;
     console.log('📊 Number of lessons:', numLessons);
     
     // Create new curriculum structure with current settings
     const newCurriculum = this.createCurriculumStructure(numLessons);
     
     // Debug: Log the actual structure created
     console.log('🏗️ Created curriculum structure sample:', {
       firstLesson: newCurriculum[0] ? {
         topicsCount: newCurriculum[0].topics.length,
         firstTopic: newCurriculum[0].topics[0] ? {
           objectivesCount: newCurriculum[0].topics[0].objectives.length,
           tasksCount: newCurriculum[0].topics[0].tasks.length
         } : null
       } : null
     });

     // Preserve existing lesson and topic titles if they exist
     if (this.currentCurriculum && this.currentCurriculum.length > 0) {
       newCurriculum.forEach((newLesson, lessonIndex) => {
         const existingLesson = this.currentCurriculum[lessonIndex];
         if (existingLesson) {
           // Preserve lesson title
           newLesson.title = existingLesson.title;
           
           // Preserve topic titles and content where they exist
           newLesson.topics.forEach((newTopic, topicIndex) => {
             const existingTopic = existingLesson.topics[topicIndex];
             if (existingTopic) {
               newTopic.title = existingTopic.title;
               
               // Preserve objectives where they exist
               newTopic.objectives.forEach((_, objIndex) => {
                 if (existingTopic.objectives[objIndex]) {
                   newTopic.objectives[objIndex] = existingTopic.objectives[objIndex];
                 }
               });
               
               // Preserve tasks where they exist
               newTopic.tasks.forEach((_, taskIndex) => {
                 if (existingTopic.tasks[taskIndex]) {
                   newTopic.tasks[taskIndex] = existingTopic.tasks[taskIndex];
                 }
               });
             }
           });
         }
       });
     }

     // Save to database
     console.log('💾 Saving curriculum to database...');
     console.log('📋 Final curriculum structure before save:', {
       lessonsCount: newCurriculum.length,
       firstLesson: newCurriculum[0] ? {
         title: newCurriculum[0].title,
         topicsCount: newCurriculum[0].topics.length,
         firstTopic: newCurriculum[0].topics[0] ? {
           title: newCurriculum[0].topics[0].title,
           objectivesCount: newCurriculum[0].topics[0].objectives.length,
           tasksCount: newCurriculum[0].topics[0].tasks.length,
           objectives: newCurriculum[0].topics[0].objectives,
           tasks: newCurriculum[0].topics[0].tasks
         } : null
       } : null
     });
     await this.saveCurriculumToDatabase(newCurriculum);
     
     // Update current curriculum and refresh display
     this.currentCurriculum = newCurriculum;
     this.renderCurriculumPreview();

     console.log('✅ Curriculum regenerated and saved with new structure');
   } catch (error) {
     console.error("❌ Error regenerating curriculum:", error);
   }
 }

 private async generateCurriculum(): Promise<void> {
 if (!this.contentLoadConfig) {
 console.warn(
 "Content load configuration not available. Please ensure you have a schedule.",
 );
 return;
 }

 try {
 // Get the number of lessons from schedule
 const { data: scheduleData } = await supabase
 .from("courses")
 .select("schedule_settings, course_sessions")
 .eq("id", this.courseId)
 .single();

 const numLessons = scheduleData?.course_sessions || 1;
 const curriculum = this.createCurriculumStructure(numLessons);

 await this.saveCurriculumToDatabase(curriculum);
 this.currentCurriculum = curriculum;
 this.renderCurriculumPreview();

 } catch (error) {
 console.error("Error generating curriculum:", error);
 alert("Failed to generate curriculum. Please try again.");
 }
 }

 private createCurriculumStructure(numLessons: number): CurriculumLesson[] {
 if (!this.contentLoadConfig) return [];

 const curriculum: CurriculumLesson[] = [];

 for (let i = 1; i <= numLessons; i++) {
 const lesson: CurriculumLesson = {
 lessonNumber: i,
 title: `Lesson ${i}`,
 topics: [],
 };

 for (let j = 1; j <= this.contentLoadConfig.topicsPerLesson; j++) {
 const topic: CurriculumTopic = {
 title: `Topic ${j}`,
 objectives: [],
 tasks: [],
 };

 // Add objectives
 for (let k = 1; k <= this.contentLoadConfig.objectivesPerTopic; k++) {
 topic.objectives.push(`Objective ${k}`);
 }

 // Add tasks
 for (let l = 1; l <= this.contentLoadConfig.tasksPerTopic; l++) {
 topic.tasks.push(`Task ${l}`);
 }

 lesson.topics.push(topic);
 }

 curriculum.push(lesson);
 }

 return curriculum;
 }

 private async saveCurriculumToDatabase(
   curriculum: CurriculumLesson[],
 ): Promise<void> {
   if (!this.courseId) {
     console.warn('📚 Cannot save curriculum: no course ID available');
     throw new Error('No course ID available for saving curriculum');
   }

   console.log('💾 Saving curriculum structure to database:', {
     courseId: this.courseId,
     lessonsCount: curriculum.length,
     sampleStructure: curriculum[0] ? {
       topicsCount: curriculum[0].topics.length,
       objectivesCount: curriculum[0].topics[0]?.objectives.length,
       tasksCount: curriculum[0].topics[0]?.tasks.length
     } : null
   });

   const { error } = await supabase
     .from("courses")
     .update({
       curriculum_data: curriculum,
     })
     .eq("id", this.courseId);

   if (error) {
     console.error('❌ Database save error:', error);
     throw error;
   }

   console.log('✅ Curriculum saved successfully to database');
 } private setPreviewMode(mode: PreviewMode): void {
   console.log('🎛️ Setting preview mode to:', mode);
   this.currentPreviewMode = mode;
   
   // Save to localStorage
   this.savePreviewMode(mode);

   // Update active button styling
   const previewModeButtons = this.curriculumPreviewSection.querySelectorAll('button[data-mode]');
   console.log('🔘 Found preview mode buttons:', previewModeButtons.length);
   
   previewModeButtons.forEach((btn) => {
     btn.classList.remove('button--active');
     if (btn.getAttribute('data-mode') === mode) {
       btn.classList.add('button--active');
       console.log('✅ Set active class on button:', btn.textContent?.trim());
     }
   });

   // Re-render preview with new mode
   this.renderCurriculumPreview();
 }

 private renderCurriculumPreview(): void {
   const previewContainer = this.curriculumPreviewSection.querySelector(
     ".curriculum__content",
   );
   if (!previewContainer || !Array.isArray(this.currentCurriculum)) return;
   
   // Show loading state first
   previewContainer.innerHTML = '<div class="loading-state text--secondary">Loading curriculum...</div>';
   
   // Generate content based on mode
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
   } else {
     this.currentCurriculum.forEach((lesson) => {
       if (this.currentPreviewMode === "all") {
         // Complete lesson template structure
         html += `
           <div class="lesson">
             <h3 class="lesson__title heading heading--large text--primary" contenteditable="true" 
                  data-lesson="${lesson.lessonNumber}" data-field="title">
               Lesson ${lesson.lessonNumber}: ${lesson.title}
             </h3>
             
             <div class="lesson__meta">
               <span class="badge badge--secondary">${this.scheduledLessonDuration} minutes</span>
               <span class="badge badge--info">${lesson.topics.length} topics</span>
             </div>`;
         
         lesson.topics.forEach((topic, topicIndex) => {
           html += `
             <div class="topic">
               <h4 class="topic__title heading heading--medium text--secondary" contenteditable="true" 
                    data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title">
                 ${topic.title}
               </h4>
               
               <div class="topic__objectives">
                 <strong class="text--medium">Learning Objectives:</strong>
                 <ul class="objectives__list">`;
           
           topic.objectives.forEach((objective, objIndex) => {
             html += `
                   <li class="text--secondary" contenteditable="true" 
                       data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-objective="${objIndex}">
                     ${objective}
                   </li>`;
           });
           
           html += `
                 </ul>
               </div>
             </div>`;
         });
         
         html += `</div>`;
         
       } else if (this.currentPreviewMode === "titles") {
         // Just lesson titles
         html += `
           <div class="lesson lesson--simple">
             <h3 class="lesson__title heading heading--large text--primary" contenteditable="true" 
                  data-lesson="${lesson.lessonNumber}" data-field="title">
               Lesson ${lesson.lessonNumber}: ${lesson.title}
             </h3>
           </div>`;
           
       } else if (this.currentPreviewMode === "topics") {
         // Lessons with topics
         html += `
           <div class="lesson lesson--medium">
             <h3 class="lesson__title heading heading--large text--primary" contenteditable="true" 
                  data-lesson="${lesson.lessonNumber}" data-field="title">
               Lesson ${lesson.lessonNumber}: ${lesson.title}
             </h3>`;
             
         lesson.topics.forEach((topic, topicIndex) => {
           html += `
             <div class="topic topic--simple">
               <h4 class="topic__title heading heading--medium text--secondary" contenteditable="true" 
                    data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title">
                 ${topic.title}
               </h4>
             </div>`;
         });
         
         html += `</div>`;
         
       } else if (this.currentPreviewMode === "objectives") {
         // Lessons with topics and objectives
         html += `
           <div class="lesson lesson--detailed">
             <h3 class="lesson__title heading heading--large text--primary" contenteditable="true" 
                  data-lesson="${lesson.lessonNumber}" data-field="title">
               Lesson ${lesson.lessonNumber}: ${lesson.title}
             </h3>`;
             
         lesson.topics.forEach((topic, topicIndex) => {
           html += `
             <div class="topic">
               <h4 class="topic__title heading heading--medium text--secondary" contenteditable="true" 
                    data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-field="title">
                 ${topic.title}
               </h4>
               
               <ul class="objectives__list">`;
           
           topic.objectives.forEach((objective, objIndex) => {
             html += `
                 <li class="text--secondary" contenteditable="true" 
                     data-lesson="${lesson.lessonNumber}" data-topic="${topicIndex}" data-objective="${objIndex}">
                   ${objective}
                 </li>`;
           });
           
           html += `
               </ul>
             </div>`;
         });
         
         html += `</div>`;
       }
     });
   }

   // Update content with smooth transition
   setTimeout(() => {
     previewContainer.innerHTML = html;
     this.bindEditableEvents();
   }, 100);
 }

 private bindEditableEvents(): void {
 const editableElements = this.curriculumPreviewSection.querySelectorAll(
 '[contenteditable="true"]',
 );
 editableElements.forEach((element) => {
 element.addEventListener("blur", (e) =>
 this.updateCurriculumData(e.target as HTMLElement),
 );
 });
 }

 private updateCurriculumData(element: HTMLElement): void {
 const lessonNum = parseInt(element.dataset.lesson || "0");
 const topicIndex = element.dataset.topic
 ? parseInt(element.dataset.topic)
 : null;
 const objectiveIndex = element.dataset.objective
 ? parseInt(element.dataset.objective)
 : null;
 const field = element.dataset.field;
 const newValue = element.textContent || "";

 const lesson = this.currentCurriculum.find(
 (l) => l.lessonNumber === lessonNum,
 );
 if (!lesson) return;

 if (field === "title" && topicIndex === null) {
 // Lesson title
 lesson.title = newValue;
 } else if (topicIndex !== null && lesson.topics[topicIndex]) {
 if (field === "title") {
 // Topic title
 lesson.topics[topicIndex].title = newValue;
 } else if (objectiveIndex !== null) {
 // Objective
 lesson.topics[topicIndex].objectives[objectiveIndex] = newValue;
 }
 }

 // Auto-save to database
 this.saveCurriculumToDatabase(this.currentCurriculum);
 }

 private async loadExistingCurriculum(): Promise<void> {
   if (!this.courseId) {
     console.warn('📚 Cannot load curriculum: no course ID available');
     this.hideCurriculumPreview();
     return;
   }

   try {
     console.log('📚 Loading existing curriculum for course:', this.courseId);
     const { data, error } = await supabase
       .from("courses")
       .select("curriculum_data")
       .eq("id", this.courseId)
       .single();

     if (error) throw error;

     if (data?.curriculum_data && Array.isArray(data.curriculum_data)) {
       this.currentCurriculum = data.curriculum_data;
       console.log('✅ Loaded existing curriculum:', {
         lessonsCount: this.currentCurriculum.length,
         sampleStructure: this.currentCurriculum[0] ? {
           topicsCount: this.currentCurriculum[0].topics.length,
           objectivesCount: this.currentCurriculum[0].topics[0]?.objectives.length,
           tasksCount: this.currentCurriculum[0].topics[0]?.tasks.length
         } : null
       });
       this.renderCurriculumPreview();
       
       // Update inputs to match loaded curriculum structure
       this.populateInputsFromExistingCurriculum();
     } else {
       console.log('ℹ️ No existing curriculum found');
       this.hideCurriculumPreview();
     }
   } catch (error) {
     console.error("❌ Error loading existing curriculum:", error);
     this.hideCurriculumPreview();
   }
 } /**
 * Set course ID after initialization
 */
 public setCourseId(courseId: string): void {
 if (this.courseId === courseId) {
 return; // No change needed
 }
 
 this.courseId = courseId;
 console.log('📚 Course ID updated for curriculum manager:', courseId);
 
 // Reload data with new course ID
 this.initializeCurriculum();
 }

 /**
 * Refresh the display to show current state
 */
 public refreshDisplay(): void {
 if (this.currentCurriculum && this.currentCurriculum.length > 0) {
 this.showPreview();
 } else {
 this.hideCurriculumPreview();
 }
 }

 /**
 * Get the current curriculum data
 */
 public getCurrentCurriculum(): CurriculumLesson[] {
 return this.currentCurriculum || [];
 }

 private showPreview(): void {
   this.curriculumPreviewSection.style.display = 'flex';
   this.renderCurriculumPreview();
 }

 private hideCurriculumPreview(): void {
   this.curriculumPreviewSection.style.display = 'none';
 }
}

// Make CurriculumManager available globally for testing/debugging
declare global {
 interface Window {
 CurriculumManager: typeof CurriculumManager;
 }
}

if (typeof window !== "undefined") {
 window.CurriculumManager = CurriculumManager;
}

export { CurriculumManager };
