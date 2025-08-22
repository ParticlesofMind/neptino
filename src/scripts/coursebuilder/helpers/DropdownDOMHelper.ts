/**
 * DropdownDOMHelper - Handles DOM operations for dropdowns
 */

import { DropdownElements } from '../types/DropdownTypes';

export class DropdownDOMHelper {
  /**
   * Get all DOM elements for a dropdown by ID
   */
  static getDropdownElements(dropdownId: string): DropdownElements | null {
    const toggle = document.getElementById(`${dropdownId}-dropdown`);
    const menu = document.getElementById(`${dropdownId}-menu`);
    const hiddenInput = document.getElementById(`${dropdownId}-value`) as HTMLInputElement;
    
    if (!toggle || !menu || !hiddenInput) {
      console.warn(`⚠️ Could not find all elements for dropdown: ${dropdownId}`);
      return null;
    }

    const textElement = toggle.querySelector('.dropdown__text') as HTMLElement;
    const loading = document.getElementById(`${dropdownId}-loading`);

    if (!textElement) {
      console.warn(`⚠️ Could not find text element for dropdown: ${dropdownId}`);
      return null;
    }

    return {
      toggle,
      menu,
      hiddenInput,
      textElement,
      loading: loading || undefined
    };
  }

  /**
   * Open a dropdown
   */
  static openDropdown(dropdownId: string): boolean {
    const elements = this.getDropdownElements(dropdownId);
    if (!elements) return false;

    elements.toggle.setAttribute('aria-expanded', 'true');
    elements.menu.classList.add('dropdown__menu--active');

    // Update icon rotation
    const icon = elements.toggle.querySelector('.dropdown__icon') as HTMLElement;
    if (icon) {
      icon.style.transform = 'rotate(180deg)';
    }

    return true;
  }

  /**
   * Close a dropdown
   */
  static closeDropdown(dropdownId: string): boolean {
    const elements = this.getDropdownElements(dropdownId);
    if (!elements) return false;

    elements.toggle.setAttribute('aria-expanded', 'false');
    elements.menu.classList.remove('dropdown__menu--active');

    // Reset icon rotation
    const icon = elements.toggle.querySelector('.dropdown__icon') as HTMLElement;
    if (icon) {
      icon.style.transform = 'rotate(0deg)';
    }

    return true;
  }

  /**
   * Check if dropdown is open
   */
  static isDropdownOpen(dropdownId: string): boolean {
    const elements = this.getDropdownElements(dropdownId);
    return elements?.toggle.getAttribute('aria-expanded') === 'true' || false;
  }

  /**
   * Enable a dropdown
   */
  static enableDropdown(dropdownId: string): boolean {
    const elements = this.getDropdownElements(dropdownId);
    if (!elements) return false;

    elements.toggle.removeAttribute('disabled');
    elements.toggle.classList.remove('dropdown__toggle--disabled');
    return true;
  }

  /**
   * Disable a dropdown
   */
  static disableDropdown(dropdownId: string): boolean {
    const elements = this.getDropdownElements(dropdownId);
    if (!elements) return false;

    elements.toggle.setAttribute('disabled', 'true');
    elements.toggle.classList.add('dropdown__toggle--disabled');
    return true;
  }

  /**
   * Update dropdown display value
   */
  static updateDropdownValue(dropdownId: string, value: string, text: string): boolean {
    const elements = this.getDropdownElements(dropdownId);
    if (!elements) return false;

    elements.textElement.textContent = text;
    elements.hiddenInput.value = value;
    elements.toggle.classList.add('coursebuilder-dropdown__toggle--selected');

    return true;
  }

  /**
   * Reset dropdown to initial state
   */
  static resetDropdown(dropdownId: string, placeholderText?: string): boolean {
    const elements = this.getDropdownElements(dropdownId);
    if (!elements) return false;

    // Reset values
    elements.hiddenInput.value = '';
    elements.textElement.textContent = placeholderText || `Select ${dropdownId.replace('-', ' ')}...`;
    
    // Clear visual state
    elements.toggle.classList.remove('coursebuilder-dropdown__toggle--selected');
    
    // Close if open
    this.closeDropdown(dropdownId);

    return true;
  }

  /**
   * Update dropdown menu content
   */
  static updateDropdownMenu(dropdownId: string, html: string): boolean {
    const elements = this.getDropdownElements(dropdownId);
    if (!elements) return false;

    elements.menu.innerHTML = html;
    return true;
  }

  /**
   * Show loading state
   */
  static showLoadingState(dropdownId: string): boolean {
    const elements = this.getDropdownElements(dropdownId);
    if (!elements) return false;

    if (elements.loading) {
      elements.loading.style.display = 'block';
    }

    return true;
  }

  /**
   * Hide loading state
   */
  static hideLoadingState(dropdownId: string): boolean {
    const elements = this.getDropdownElements(dropdownId);
    if (!elements) return false;

    if (elements.loading) {
      elements.loading.style.display = 'none';
    }

    return true;
  }

  /**
   * Get all dropdown IDs that are currently open
   */
  static getOpenDropdowns(): string[] {
    const openDropdowns: string[] = [];
    const expandedElements = document.querySelectorAll('.coursebuilder-dropdown [aria-expanded="true"]');
    
    expandedElements.forEach(element => {
      const id = element.id.replace('-dropdown', '');
      openDropdowns.push(id);
    });

    return openDropdowns;
  }

  /**
   * Close all open dropdowns
   */
  static closeAllDropdowns(): void {
    const openDropdowns = this.getOpenDropdowns();
    openDropdowns.forEach(dropdownId => {
      this.closeDropdown(dropdownId);
    });
  }

  /**
   * Check if element is part of dropdown
   */
  static isElementPartOfDropdown(element: Element, dropdownId: string): boolean {
    const elements = this.getDropdownElements(dropdownId);
    if (!elements) return false;

    return elements.toggle.contains(element) || elements.menu.contains(element);
  }

  /**
   * Find dropdown ID from DOM element
   */
  static getDropdownIdFromElement(element: Element): string | null {
    // Check if element is a dropdown toggle
    if (element.id.endsWith('-dropdown')) {
      return element.id.replace('-dropdown', '');
    }

    // Check if element is inside a dropdown
    const dropdownElement = element.closest('[id$="-dropdown"], [id$="-menu"]');
    if (dropdownElement?.id) {
      return dropdownElement.id.replace(/-dropdown$|-menu$/, '');
    }

    return null;
  }
}
