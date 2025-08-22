/**
 * CourseBuilder Classification Dropdown Handler
 * Refactored to use helper classes for better maintainability
 */

import { 
  loadClassYearData, 
  loadCurricularFrameworkData, 
  loadIscedData,
  getSubjectsByDomain,
  getTopicsBySubject,
  getSubtopicsByTopic,
  getAvailableCourses 
} from '../backend/courses/classifyCourse';

import { DropdownDOMHelper } from './helpers/DropdownDOMHelper';
import { DropdownRenderer } from './helpers/DropdownRenderer';
import { 
  DropdownOption, 
  DropdownDataConfig, 
  CascadingConfig,
  DataLoader
} from './types/DropdownTypes';

export class CourseBuilderDropdownHandler {
  private courseId: string = '';
  private activeDropdownId: string | null = null;
  
  // Configuration for all dropdowns
  private readonly dropdownConfigs: Record<string, DropdownDataConfig> = {
    'class-year': {
      loader: loadClassYearData,
      dataKey: 'classYears',
      isAsync: true
    },
    'curricular-framework': {
      loader: loadCurricularFrameworkData,
      dataKey: 'curricularFrameworks', 
      isAsync: true
    },
    'domain': {
      loader: loadIscedData,
      dataKey: 'domains',
      isAsync: true
    },
    'subject': {
      loader: (domainValue: string) => getSubjectsByDomain(domainValue),
      isAsync: false
    },
    'topic': {
      loader: (domainValue: string, subjectValue: string) => getTopicsBySubject(domainValue, subjectValue),
      isAsync: false
    },
    'subtopic': {
      loader: (domainValue: string, subjectValue: string, topicValue: string) => 
        getSubtopicsByTopic(domainValue, subjectValue, topicValue),
      isAsync: false
    },
    'previous-course': {
      loader: getAvailableCourses,
      isAsync: true
    },
    'current-course': {
      loader: getAvailableCourses, 
      isAsync: true
    },
    'next-course': {
      loader: getAvailableCourses,
      isAsync: true
    }
  };

  // Cascading relationships
  private readonly cascadingConfigs: Record<string, CascadingConfig> = {
    'domain': {
      dependsOn: [],
      resets: ['subject', 'topic', 'subtopic'],
      populateMethod: (values) => this.populateDropdown('subject', values.domain)
    },
    'subject': {
      dependsOn: ['domain'],
      resets: ['topic', 'subtopic'], 
      populateMethod: (values) => this.populateDropdown('topic', values.domain, values.subject)
    },
    'topic': {
      dependsOn: ['domain', 'subject'],
      resets: ['subtopic'],
      populateMethod: (values) => this.populateDropdown('subtopic', values.domain, values.subject, values.topic)
    }
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing CourseBuilder Dropdown Handler...');
      
      this.setupEventListeners();
      await this.populateStaticDropdowns();
      
      console.log('✅ CourseBuilder Dropdown Handler initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing CourseBuilder Dropdown Handler:', error);
    }
  }

  private setupEventListeners(): void {
    const dropdownIds = Object.keys(this.dropdownConfigs);

    dropdownIds.forEach(id => {
      const elements = DropdownDOMHelper.getDropdownElements(id);
      if (!elements) return;

      // Toggle dropdown on button click
      elements.toggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleDropdown(id);
      });

      // Handle option selection
      elements.menu.addEventListener('click', (e) => {
        const link = (e.target as HTMLElement).closest('.dropdown__link') as HTMLElement;
        if (link) {
          e.preventDefault();
          const value = link.dataset.value || '';
          const text = link.textContent?.trim() || '';
          this.selectOption(id, value, text);
        }
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.activeDropdownId) return;
      
      if (!DropdownDOMHelper.isElementPartOfDropdown(e.target as Element, this.activeDropdownId)) {
        DropdownDOMHelper.closeDropdown(this.activeDropdownId);
        this.activeDropdownId = null;
      }
    });
  }

  private toggleDropdown(dropdownId: string): void {
    const isOpen = DropdownDOMHelper.isDropdownOpen(dropdownId);

    // Close all dropdowns first
    DropdownDOMHelper.closeAllDropdowns();
    this.activeDropdownId = null;

    if (!isOpen) {
      DropdownDOMHelper.openDropdown(dropdownId);
      this.activeDropdownId = dropdownId;
    }
  }

  private selectOption(dropdownId: string, value: string, text: string): void {
    DropdownDOMHelper.updateDropdownValue(dropdownId, value, text);
    this.handleCascadingUpdates(dropdownId, value);
    DropdownDOMHelper.closeDropdown(dropdownId);
    
    if (this.activeDropdownId === dropdownId) {
      this.activeDropdownId = null;
    }

    console.log(`📝 Selected ${dropdownId}:`, { value, text });
  }

  private handleCascadingUpdates(dropdownId: string, value: string): void {
    const config = this.cascadingConfigs[dropdownId];
    if (!config) return;

    // Reset dependent dropdowns
    config.resets.forEach(dependentId => {
      const placeholderText = DropdownRenderer.getPlaceholderText(dependentId);
      const emptyMessage = DropdownRenderer.getEmptyStateText(dependentId);
      
      DropdownDOMHelper.resetDropdown(dependentId, placeholderText);
      DropdownDOMHelper.updateDropdownMenu(dependentId, DropdownRenderer.renderEmptyState(emptyMessage));
      DropdownDOMHelper.disableDropdown(dependentId);
    });

    // Get current values for cascading
    const currentValues: Record<string, string> = { [dropdownId]: value };
    config.dependsOn.forEach(dep => {
      const elements = DropdownDOMHelper.getDropdownElements(dep);
      if (elements) {
        currentValues[dep] = elements.hiddenInput.value;
      }
    });

    // Populate next level
    config.populateMethod(currentValues);
  }

  private async populateStaticDropdowns(): Promise<void> {
    const staticDropdowns = ['class-year', 'curricular-framework', 'domain', 'previous-course', 'current-course', 'next-course'];
    
    await Promise.all(
      staticDropdowns.map(dropdownId => this.populateDropdown(dropdownId))
    );
  }

  private async populateDropdown(dropdownId: string, ...args: any[]): Promise<void> {
    const config = this.dropdownConfigs[dropdownId];
    if (!config) {
      console.error(`No configuration found for dropdown: ${dropdownId}`);
      return;
    }

    try {
      DropdownDOMHelper.showLoadingState(dropdownId);
      
      let data: any;
      if (config.isAsync) {
        data = await (config.loader as DataLoader)(...args);
      } else {
        data = (config.loader as DataLoader)(...args);
      }

      // Extract options from data
      const options: DropdownOption[] = config.dataKey ? data[config.dataKey] : data;
      
      if (!Array.isArray(options)) {
        throw new Error(`Expected array of options for ${dropdownId}`);
      }

      // Render dropdown content
      const html = this.renderDropdownContent(dropdownId, options);
      DropdownDOMHelper.updateDropdownMenu(dropdownId, html);
      DropdownDOMHelper.enableDropdown(dropdownId);
      
    } catch (error) {
      console.error(`Error populating ${dropdownId} dropdown:`, error);
      const errorMessage = `Error loading ${dropdownId.replace('-', ' ')}`;
      const errorHTML = DropdownRenderer.renderErrorState(errorMessage);
      DropdownDOMHelper.updateDropdownMenu(dropdownId, errorHTML);
    } finally {
      DropdownDOMHelper.hideLoadingState(dropdownId);
    }
  }

  private renderDropdownContent(dropdownId: string, options: DropdownOption[]): string {
    // Special handling for course dropdowns
    if (['previous-course', 'current-course', 'next-course'].includes(dropdownId)) {
      const mappedOptions = options.map((course: any) => ({
        value: course.id,
        label: course.course_name
      }));
      
      return DropdownRenderer.renderDropdownMenu(mappedOptions, {
        showHeader: true,
        headerText: 'Your Courses',
        emptyMessage: 'No courses available'
      });
    }

    // Standard dropdown rendering
    return DropdownRenderer.renderDropdownMenu(options, {
      emptyMessage: DropdownRenderer.getEmptyStateText(dropdownId)
    });
  }

  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================

  /**
   * Update course ID and refresh dropdowns if needed
   */
  setCourseId(courseId: string): void {
    this.courseId = courseId;
    console.log(`📋 Dropdown handler updated with course ID: ${courseId}`);
  }

  /**
   * Get current course ID
   */
  getCourseId(): string {
    return this.courseId;
  }

  /**
   * Manually populate a specific dropdown
   */
  async refreshDropdown(dropdownId: string, ...args: any[]): Promise<void> {
    await this.populateDropdown(dropdownId, ...args);
  }

  /**
   * Get current value of a dropdown
   */
  getDropdownValue(dropdownId: string): string {
    const elements = DropdownDOMHelper.getDropdownElements(dropdownId);
    return elements?.hiddenInput.value || '';
  }

  /**
   * Set dropdown value programmatically
   */
  setDropdownValue(dropdownId: string, value: string, text: string): void {
    this.selectOption(dropdownId, value, text);
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('coursebuilder.html')) {
    new CourseBuilderDropdownHandler();
  }
});
