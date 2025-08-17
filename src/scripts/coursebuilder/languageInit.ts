/**
 * Direct Language Initialization
 * Loads languages into the course language dropdown immediately when page loads
 */

interface Language {
  code: string;
  name: string;
  nativeName: string;
  speakers?: number;
}

async function loadCourseLanguages(): Promise<Language[]> {
  try {
    const response = await fetch('/src/scripts/json/courseLanguage.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('✅ Languages loaded:', data.length);
    return data;
  } catch (error) {
    console.error('❌ Failed to load languages:', error);
    return getFallbackLanguages();
  }
}

function getFallbackLanguages(): Language[] {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' }
  ];
}

function populateLanguageDropdown(languages: Language[]): void {
  const select = document.getElementById('course-language') as HTMLSelectElement;
  
  if (!select) {
    console.error('❌ Course language select element not found');
    return;
  }

  // Clear existing options
  select.innerHTML = '';

  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select language...';
  select.appendChild(defaultOption);

  // Sort languages by name for better UX
  const sortedLanguages = languages.sort((a, b) => a.name.localeCompare(b.name));

  // Add language options
  sortedLanguages.forEach(language => {
    const option = document.createElement('option');
    option.value = language.code;
    option.textContent = `${language.name} (${language.nativeName})`;
    select.appendChild(option);
  });

  console.log(`✅ Populated ${languages.length} languages in dropdown`);
}

async function initializeLanguageDropdown(): Promise<void> {
  console.log('🌍 Initializing language dropdown...');
  
  const languages = await loadCourseLanguages();
  populateLanguageDropdown(languages);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLanguageDropdown);
} else {
  initializeLanguageDropdown();
}

// Also export for manual calling if needed
(window as any).initializeLanguageDropdown = initializeLanguageDropdown;
