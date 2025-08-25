/**
 * CourseBuilder Initialization Module
 * Handles form initialization, language loading, and debugging utilities
 */

import { populateCourseLanguageSelect } from '../backend/courses/settings/languageLoader.ts';
import { CourseFormHandler } from '../backend/courses/shared/courseFormHandler.ts';

/**
 * Initialize course language dropdown
 */
function initLanguages(): void {
  const select = document.querySelector('[name="course_language"]') as HTMLSelectElement;
  if (select) {
    console.log('🌍 Initializing course languages...');
    populateCourseLanguageSelect(select);
  } else {
    console.error('❌ Course language select not found');
  }
}

/**
 * Initialize forms and course data loading
 */
function initFormsWithCourseData(): void {
  // Check if there's a courseId in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('courseId');

  if (courseId) {
    console.log('🔄 Course ID found in URL:', courseId, '- Loading existing course data...');

    // Wait for navigation system to complete (100ms) + extra buffer
    // Initialize essentials form handler to load existing data
    setTimeout(() => {
      try {
        console.log('🔄 Creating essentials form handler...');
        const formHandler = new CourseFormHandler('essentials');
        (window as any).essentialsFormHandler = formHandler;
        console.log('✅ Essentials form handler created');
      } catch (error) {
        console.error('❌ Failed to initialize essentials form handler:', error);
      }
    }, 200); // Wait for AsideNavigation (100ms) + buffer
  } else {
    console.log('ℹ️ No course ID in URL - new course mode');
  }
}

/**
 * Development and debugging utilities
 */
function initDebugUtilities(): void {
  // Add manual test function for debugging
  (window as any).testLoadCourseData = async function (testCourseId: string) {
    console.log('🧪 Testing course data loading for ID:', testCourseId);

    if (!testCourseId || testCourseId === 'undefined') {
      console.error('❌ Invalid courseId provided:', testCourseId);
      return;
    }

    try {
      // Temporarily set course ID in URL FIRST
      const url = new URL(window.location.href);
      url.searchParams.set('courseId', testCourseId);
      window.history.pushState({}, '', url);

      console.log('📋 URL updated with courseId:', testCourseId);
      console.log('🔄 Current URL:', window.location.href);
      console.log('🔄 Current search params:', window.location.search);

      // Wait a bit for URL to update and navigation to complete
      setTimeout(() => {
        console.log('🔄 Creating form handler after URL update...');
        // Now create form handler - it should pick up the courseId from the URL
        const formHandler = new CourseFormHandler('essentials');
        (window as any).testFormHandler = formHandler;
        console.log('✅ Test form handler created - check if form fields are populated');
      }, 200); // Wait for navigation system to complete

    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  };

  // Also add a function to manually set courseId and reload
  (window as any).setCourseIdAndReload = function (courseId: string) {
    if (!courseId || courseId === 'undefined') {
      console.error('❌ Invalid courseId provided:', courseId);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('courseId', courseId);
    window.location.href = url.toString();
  };

  // Add function to list existing courses to get real IDs
  (window as any).listExistingCourses = async function () {
    try {
      console.log('Fetching courses...');

      // Import the getUserCourses function dynamically
      const { getUserCourses } = await import('../backend/courses/essentials/createCourse.ts');
      const courses = await getUserCourses();

      if (courses && courses.length > 0) {
        console.log('📚 Existing courses:');
        courses.forEach((course, index) => {
          console.log(`${index + 1}. ${course.course_name} (ID: ${course.id})`);
        });
        console.log('💡 To test with a course, run: setCourseIdAndReload("COURSE_ID_HERE")');
        return courses;
      } else {
        console.log('⚠️ No courses found. Create a course first.');
      }
    } catch (error) {
      console.error('❌ Error fetching courses:', error);
    }
  };

  // Add function to list existing templates
  (window as any).listExistingTemplates = async function () {
    try {
      console.log('Fetching templates...');
      // Import createTemplate to access TemplateManager
      const { TemplateManager } = await import('../backend/courses/templates/createTemplate.ts');
      await TemplateManager.loadTemplatesForModal();
      console.log('✅ Templates loaded in modal - check load template modal');
    } catch (error) {
      console.error('❌ Error fetching templates:', error);
    }
  };

  // Add function to force refresh language dropdown
  (window as any).fixLanguageDropdown = async function () {
    try {
      console.log('🔧 Fixing language dropdown...');
      const languageSelect = document.querySelector('[name="course_language"]') as HTMLSelectElement;
      if (languageSelect) {
        const { populateCourseLanguageSelect } = await import('../backend/courses/settings/languageLoader.ts');
        await populateCourseLanguageSelect(languageSelect);

        // Try to set the language value again
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('courseId');
        if (courseId && courseId !== 'undefined') {
          const { getCourse } = await import('../backend/courses/essentials/createCourse.ts');
          const courseData = await getCourse(courseId);
          if (courseData && courseData.course_language) {
            // Find the option that contains the language
            for (let i = 0; i < languageSelect.options.length; i++) {
              const option = languageSelect.options[i];
              if (option.textContent?.toLowerCase().includes(courseData.course_language.toLowerCase()) ||
                option.value === courseData.course_language) {
                languageSelect.value = option.value;
                console.log('✅ Language dropdown fixed:', option.textContent);
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fixing language dropdown:', error);
    }
  };

  // Also add a function to manually load data for existing course ID in URL
  (window as any).loadExistingCourseData = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');

    if (!courseId) {
      console.error('❌ No courseId in URL. Add ?courseId=your-id to the URL first');
      return;
    }

    console.log('🔄 Loading data for course ID:', courseId);
    const formHandler = new CourseFormHandler('essentials');
    (window as any).currentFormHandler = formHandler;
  };
}

/**
 * Main initialization function
 */
export function initCourseBuilder(): void {
  const init = () => {
    setTimeout(() => {
      initLanguages();
      initFormsWithCourseData();
      initDebugUtilities();
    }, 200);
  };

  // Initialize everything
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// Auto-initialize when module is loaded
initCourseBuilder();
