/**
 * DropdownRenderer - Handles HTML template generation for dropdowns
 */

import { DropdownOption, DropdownRenderOptions } from '../types/DropdownTypes';

export class DropdownRenderer {
  /**
   * Generate HTML for dropdown options
   */
  static renderOptions(options: DropdownOption[], showCode: boolean = false): string {
    if (!options || options.length === 0) {
      return '';
    }

    return options
      .map(option => this.renderOption(option, showCode))
      .join('');
  }

  /**
   * Generate HTML for a single dropdown option
   */
  private static renderOption(option: DropdownOption, showCode: boolean): string {
    const descriptionHTML = this.renderOptionDescription(option, showCode);
    
    return `
      <div class="dropdown__item" role="none">
        <button class="dropdown__link" data-value="${this.escapeHtml(option.value)}" role="option" type="button">
          <div class="dropdown__option-content">
            <div class="dropdown__option-title">${this.escapeHtml(option.label)}</div>
            ${descriptionHTML}
          </div>
        </button>
      </div>
    `;
  }

  /**
   * Generate description HTML for an option
   */
  private static renderOptionDescription(option: DropdownOption, showCode: boolean): string {
    const parts: string[] = [];
    
    if (option.description) {
      parts.push(this.escapeHtml(option.description));
    }
    
    if (showCode && option.code) {
      parts.push(`Code: ${this.escapeHtml(option.code)}`);
    }
    
    return parts.length > 0 
      ? `<div class="dropdown__option-description">${parts.join(' • ')}</div>`
      : '';
  }

  /**
   * Generate complete dropdown menu HTML
   */
  static renderDropdownMenu(
    options: DropdownOption[], 
    config: DropdownRenderOptions = {}
  ): string {
    const { showHeader = false, headerText = '', emptyMessage = 'No options available' } = config;
    
    let html = '';
    
    // Add header if specified
    if (showHeader && headerText) {
      html += `<div class="dropdown__header coursebuilder-dropdown__header">${this.escapeHtml(headerText)}</div>`;
    }
    
    // Add options or empty state
    if (options.length === 0) {
      html += this.renderEmptyState(emptyMessage);
    } else {
      html += this.renderOptions(options, true); // Show codes by default
    }
    
    return html;
  }

  /**
   * Generate empty state HTML
   */
  static renderEmptyState(message: string): string {
    return `<div class="coursebuilder-dropdown__empty">${this.escapeHtml(message)}</div>`;
  }

  /**
   * Generate loading state HTML
   */
  static renderLoadingState(message: string = 'Loading...'): string {
    return `<div class="coursebuilder-dropdown__loading">${this.escapeHtml(message)}</div>`;
  }

  /**
   * Generate error state HTML
   */
  static renderErrorState(message: string): string {
    return `<div class="coursebuilder-dropdown__error">${this.escapeHtml(message)}</div>`;
  }

  /**
   * Generate placeholder text for dependent dropdowns
   */
  static getPlaceholderText(dropdownId: string): string {
    const placeholders: Record<string, string> = {
      'subject': 'Select domain first...',
      'topic': 'Select subject first...',
      'subtopic': 'Select topic first...',
    };
    
    return placeholders[dropdownId] || `Select ${dropdownId.replace('-', ' ')}...`;
  }

  /**
   * Generate empty state text for dependent dropdowns
   */
  static getEmptyStateText(dropdownId: string): string {
    const emptyStates: Record<string, string> = {
      'subject': 'Select a domain first',
      'topic': 'Select a subject first',
      'subtopic': 'Select a topic first',
    };
    
    return emptyStates[dropdownId] || 'No options available';
  }

  /**
   * Escape HTML to prevent XSS attacks
   */
  private static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
