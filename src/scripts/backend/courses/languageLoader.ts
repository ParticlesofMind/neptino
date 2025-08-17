// ==========================================================================
// COURSE LANGUAGE LOADER
// ==========================================================================

export interface CourseLanguage {
  code: string;
  name: string;
  nativeName: string;
  speakers: number;
}

export interface LanguageData {
  languages: CourseLanguage[];
}

// Cache for loaded languages
let cachedLanguages: CourseLanguage[] | null = null;

/**
 * Load course languages from JSON file
 */
export async function loadCourseLanguages(): Promise<CourseLanguage[]> {
  if (cachedLanguages) {
    return cachedLanguages;
  }

  try {
    const response = await fetch('/src/scripts/json/courseLanguage.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load languages: ${response.status}`);
    }

    const data: LanguageData = await response.json();
    
    if (!data.languages || !Array.isArray(data.languages)) {
      throw new Error('Invalid language data format');
    }

    // Sort languages by name for better UX
    cachedLanguages = data.languages.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('📚 Loaded', cachedLanguages.length, 'course languages');
    return cachedLanguages;

  } catch (error) {
    console.error('Error loading course languages:', error);
    
    // Return fallback languages if JSON fails to load
    const fallbackLanguages: CourseLanguage[] = [
      { code: 'en', name: 'English', nativeName: 'English', speakers: 379000000 },
      { code: 'es', name: 'Spanish', nativeName: 'Español', speakers: 460000000 },
      { code: 'fr', name: 'French', nativeName: 'Français', speakers: 280000000 },
      { code: 'de', name: 'German', nativeName: 'Deutsch', speakers: 132000000 },
      { code: 'it', name: 'Italian', nativeName: 'Italiano', speakers: 65000000 },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português', speakers: 252000000 },
      { code: 'ru', name: 'Russian', nativeName: 'Русский', speakers: 258000000 },
      { code: 'zh-CN', name: 'Mandarin Chinese', nativeName: '中文 (简体)', speakers: 918000000 },
      { code: 'ja', name: 'Japanese', nativeName: '日本語', speakers: 128000000 },
      { code: 'ko', name: 'Korean', nativeName: '한국어', speakers: 77000000 }
    ];
    
    cachedLanguages = fallbackLanguages;
    return fallbackLanguages;
  }
}

/**
 * Populate course language select element
 */
export async function populateCourseLanguageSelect(selectElement: HTMLSelectElement): Promise<void> {
  try {
    const languages = await loadCourseLanguages();
    
    // Clear existing options except the first placeholder
    const placeholder = selectElement.querySelector('option[value=""]');
    selectElement.innerHTML = '';
    
    if (placeholder) {
      selectElement.appendChild(placeholder);
    } else {
      // Add default placeholder if none exists
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select language...';
      selectElement.appendChild(defaultOption);
    }
    
    // Add language options
    languages.forEach(language => {
      const option = document.createElement('option');
      option.value = language.code;
      option.textContent = `${language.name} (${language.nativeName})`;
      option.setAttribute('data-speakers', language.speakers.toString());
      selectElement.appendChild(option);
    });

    console.log('📚 Populated course language select with', languages.length, 'languages');

  } catch (error) {
    console.error('Error populating course language select:', error);
  }
}

/**
 * Get language by code
 */
export async function getCourseLanguageByCode(code: string): Promise<CourseLanguage | null> {
  const languages = await loadCourseLanguages();
  return languages.find(lang => lang.code === code) || null;
}

/**
 * Initialize language select on page load
 */
export function initializeCourseLanguageSelect(): void {
  document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('course-language') as HTMLSelectElement;
    if (languageSelect) {
      populateCourseLanguageSelect(languageSelect);
    }
  });
}

// Auto-initialize when this module is loaded
if (typeof window !== 'undefined') {
  // If DOM is already loaded, initialize immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const languageSelect = document.getElementById('course-language') as HTMLSelectElement;
      if (languageSelect) {
        console.log('🌍 Found course language select, populating...');
        populateCourseLanguageSelect(languageSelect);
      } else {
        console.log('⚠️ Course language select not found');
      }
    });
  } else {
    // DOM already loaded
    const languageSelect = document.getElementById('course-language') as HTMLSelectElement;
    if (languageSelect) {
      console.log('🌍 Found course language select (DOM ready), populating...');
      populateCourseLanguageSelect(languageSelect);
    } else {
      console.log('⚠️ Course language select not found (DOM ready)');
    }
  }
}
