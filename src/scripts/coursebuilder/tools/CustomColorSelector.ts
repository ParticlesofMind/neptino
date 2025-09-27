/**
 * CustomColorSelector - Replace Select2 color dropdowns with custom component
 * Provides a clean interface for selecting colors with a popup card
 */

interface ColorOption {
  name: string;
  value: string;
  hex: string;
}

export class CustomColorSelector {
  private container: HTMLElement;
  private trigger!: HTMLButtonElement;
  private dropdown!: HTMLElement;
  private currentColor: ColorOption;
  private onColorChange: (color: ColorOption) => void;
  private isOpen: boolean = false;
  private allowTransparent: boolean = false;

  // Neptino's color palette
  private penColors: ColorOption[] = [
    { name: 'Black', value: '#1a1a1a', hex: '#1a1a1a' },
    { name: 'Green', value: '#4a7c59', hex: '#4a7c59' },
    { name: 'Blue', value: '#4a79a4', hex: '#4a79a4' },
    { name: 'Red', value: '#a74a4a', hex: '#a74a4a' },
    { name: 'Gray', value: '#6b7280', hex: '#6b7280' },
    { name: 'Orange', value: '#b87333', hex: '#b87333' },
    { name: 'Purple', value: '#7c5a9b', hex: '#7c5a9b' },
    { name: 'Yellow', value: '#b8a642', hex: '#b8a642' },
    { name: 'Slate', value: '#64748b', hex: '#64748b' },
    { name: 'White', value: '#f8fafc', hex: '#f8fafc' }
  ];

  private documentColors: ColorOption[] = [
    { name: 'Black', value: '#000000', hex: '#000000' },
    { name: 'Purple', value: '#7c5a9b', hex: '#7c5a9b' }
  ];

  private brandColors: ColorOption[] = [
    { name: 'Brand Purple', value: '#7c5a9b', hex: '#7c5a9b' },
    { name: 'Brand Purple Light', value: '#a67db8', hex: '#a67db8' },
    { name: 'Brand Red', value: '#a74a4a', hex: '#a74a4a' },
    { name: 'Brand Blue', value: '#4a79a4', hex: '#4a79a4' }
  ];

  private transparentOption: ColorOption = {
    name: 'No Fill',
    value: 'transparent',
    hex: 'transparent'
  };

  constructor(
    container: HTMLElement,
    initialColor: string = '#1a1a1a',
    onColorChange: (color: ColorOption) => void,
    allowTransparent: boolean = false
  ) {
    this.container = container;
    this.onColorChange = onColorChange;
    this.allowTransparent = allowTransparent;
    
    // Find initial color in palette
    this.currentColor = this.findColorByValue(initialColor) || this.penColors[0];
    
    this.init();
  }

  private init(): void {
    this.createTrigger();
    this.createDropdown();
    this.bindEvents();
  }

  private createTrigger(): void {
    this.trigger = document.createElement('button') as HTMLButtonElement;
    this.trigger.className = 'color-selector__trigger';
    this.trigger.type = 'button';
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.setAttribute('aria-haspopup', 'true');
    this.trigger.setAttribute('aria-label', `Selected color: ${this.currentColor.name}`);

    const swatch = document.createElement('div');
    swatch.className = 'color-selector__trigger-swatch';
    
    if (this.currentColor.value === 'transparent') {
      swatch.classList.add('color-selector__trigger-swatch--transparent');
    } else {
      swatch.style.backgroundColor = this.currentColor.hex;
    }

    this.trigger.appendChild(swatch);
    this.container.appendChild(this.trigger);
  }

  private createDropdown(): void {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'color-selector__dropdown';
    this.dropdown.setAttribute('role', 'listbox');
    this.dropdown.setAttribute('aria-label', 'Color options');

    // Pen colors section
    const penSection = this.createColorSection('Pen colors', this.penColors, 'pen');
    this.dropdown.appendChild(penSection);

    // Document colors section  
    const docSection = this.createColorSection('Document colors', this.documentColors, 'document');
    this.dropdown.appendChild(docSection);

    // Brand colors section
    const brandSection = this.createColorSection('Brand colors', this.brandColors, 'brand');
    this.dropdown.appendChild(brandSection);

    // Add transparent option if allowed
    if (this.allowTransparent) {
      const transparentSection = this.createTransparentSection();
      this.dropdown.insertBefore(transparentSection, this.dropdown.firstChild);
    }

    // Append to body to avoid parent container constraints
    document.body.appendChild(this.dropdown);
  }

  private createColorSection(title: string, colors: ColorOption[], iconType: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'color-selector__section';

    const titleEl = document.createElement('div');
    titleEl.className = 'color-selector__section-title';
    
    // Add icon based on section type
    const icon = document.createElement('div');
    icon.innerHTML = this.getIconForSection(iconType);
    titleEl.appendChild(icon);
    
    const titleText = document.createElement('span');
    titleText.textContent = title;
    titleEl.appendChild(titleText);
    
    section.appendChild(titleEl);

    const grid = document.createElement('div');
    grid.className = 'color-selector__section-grid';

    colors.forEach((color) => {
      const colorEl = document.createElement('button');
      colorEl.className = 'color-selector__color';
      colorEl.type = 'button';
      colorEl.setAttribute('role', 'option');
      colorEl.setAttribute('aria-selected', color.hex === this.currentColor.hex ? 'true' : 'false');
      colorEl.setAttribute('data-color', color.value);
      colorEl.setAttribute('data-hex', color.hex);
      colorEl.setAttribute('aria-label', color.name);
      colorEl.style.backgroundColor = color.hex;

      if (color.hex === this.currentColor.hex) {
        colorEl.classList.add('color-selector__color--selected');
      }

      colorEl.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectColor(color);
      });

      grid.appendChild(colorEl);
    });

    // Add "add color" button for custom colors (only for document colors)
    if (iconType === 'document') {
      const addColorBtn = document.createElement('button');
      addColorBtn.className = 'color-selector__add-color';
      addColorBtn.type = 'button';
      addColorBtn.setAttribute('aria-label', 'Add custom color');
      addColorBtn.textContent = '+';
      
      addColorBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openColorPicker();
      });

      grid.appendChild(addColorBtn);
    }

    section.appendChild(grid);
    return section;
  }

  private createTransparentSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'color-selector__section';

    const grid = document.createElement('div');
    grid.className = 'color-selector__section-grid';

    const transparentEl = document.createElement('button');
    transparentEl.className = 'color-selector__color color-selector__color--transparent';
    transparentEl.type = 'button';
    transparentEl.setAttribute('role', 'option');
    transparentEl.setAttribute('aria-selected', this.currentColor.value === 'transparent' ? 'true' : 'false');
    transparentEl.setAttribute('data-color', 'transparent');
    transparentEl.setAttribute('data-hex', 'transparent');
    transparentEl.setAttribute('aria-label', 'No Fill');

    if (this.currentColor.value === 'transparent') {
      transparentEl.classList.add('color-selector__color--selected');
    }

    transparentEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.selectColor(this.transparentOption);
    });

    grid.appendChild(transparentEl);
    section.appendChild(grid);
    return section;
  }

  private getIconForSection(type: string): string {
    switch (type) {
      case 'pen':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        </svg>`;
      case 'document':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
        </svg>`;
      case 'brand':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
        </svg>`;
      default:
        return '';
    }
  }

  private bindEvents(): void {
    // Toggle dropdown on trigger click
    this.trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node) && !this.dropdown.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });

    // Handle keyboard navigation
    this.dropdown.addEventListener('keydown', (e) => this.handleDropdownKeydown(e));

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeDropdown();
        this.trigger.focus();
      }
    });
  }

  private handleDropdownKeydown(e: KeyboardEvent): void {
    const colors = Array.from(this.dropdown.querySelectorAll('.color-selector__color, .color-selector__add-color')) as HTMLButtonElement[];
    const currentIndex = colors.findIndex(color => color === document.activeElement);

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = currentIndex < colors.length - 1 ? currentIndex + 1 : 0;
        colors[nextIndex].focus();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : colors.length - 1;
        colors[prevIndex].focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        // Move to next row (6 colors per row)
        const nextRowIndex = Math.min(currentIndex + 6, colors.length - 1);
        colors[nextRowIndex].focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Move to previous row
        const prevRowIndex = Math.max(currentIndex - 6, 0);
        colors[prevRowIndex].focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        (e.target as HTMLButtonElement).click();
        break;
    }
  }

  private toggleDropdown(): void {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private openDropdown(): void {
    this.isOpen = true;
    this.dropdown.classList.add('color-selector__dropdown--open');
    this.trigger.classList.add('color-selector__trigger--active');
    this.trigger.setAttribute('aria-expanded', 'true');

    // Position dropdown relative to trigger
    this.positionDropdown();

    // Focus first color option
    const firstColor = this.dropdown.querySelector('.color-selector__color') as HTMLButtonElement;
    if (firstColor) {
      firstColor.focus();
    }
  }

  private positionDropdown(): void {
    const triggerRect = this.trigger.getBoundingClientRect();
    const dropdownRect = this.dropdown.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Default position (below trigger, centered)
    let top = triggerRect.bottom + 8;
    let left = triggerRect.left + (triggerRect.width / 2) - (dropdownRect.width / 2);

    // Adjust if dropdown would go off screen
    if (left < 8) {
      left = 8;
    } else if (left + dropdownRect.width > viewportWidth - 8) {
      left = viewportWidth - dropdownRect.width - 8;
    }

    // If dropdown would go below viewport, show above trigger
    if (top + dropdownRect.height > viewportHeight - 8) {
      top = triggerRect.top - dropdownRect.height - 8;
    }

    this.dropdown.style.position = 'fixed';
    this.dropdown.style.top = `${top}px`;
    this.dropdown.style.left = `${left}px`;
    this.dropdown.style.transform = 'none';
  }

  private closeDropdown(): void {
    this.isOpen = false;
    this.dropdown.classList.remove('color-selector__dropdown--open');
    this.trigger.classList.remove('color-selector__trigger--active');
    this.trigger.setAttribute('aria-expanded', 'false');
  }

  private selectColor(color: ColorOption): void {
    this.currentColor = color;
    this.updateTrigger();
    this.updateDropdownSelection();
    this.onColorChange(color);
    this.closeDropdown();
  }

  private updateTrigger(): void {
    const swatch = this.trigger.querySelector('.color-selector__trigger-swatch') as HTMLElement;
    
    // Update swatch appearance
    swatch.className = 'color-selector__trigger-swatch';
    if (this.currentColor.value === 'transparent') {
      swatch.classList.add('color-selector__trigger-swatch--transparent');
      swatch.style.backgroundColor = '';
    } else {
      swatch.style.backgroundColor = this.currentColor.hex;
    }

    // Update aria label
    this.trigger.setAttribute('aria-label', `Selected color: ${this.currentColor.name}`);
  }

  private updateDropdownSelection(): void {
    // Remove all selected states
    const allColors = this.dropdown.querySelectorAll('.color-selector__color');
    allColors.forEach((color) => {
      color.classList.remove('color-selector__color--selected');
      color.setAttribute('aria-selected', 'false');
    });

    // Add selected state to current color
    const selectedColor = this.dropdown.querySelector(`[data-hex="${this.currentColor.hex}"]`);
    if (selectedColor) {
      selectedColor.classList.add('color-selector__color--selected');
      selectedColor.setAttribute('aria-selected', 'true');
    }
  }

  private findColorByValue(value: string): ColorOption | null {
    const allColors = [...this.penColors, ...this.documentColors, ...this.brandColors];
    if (this.allowTransparent && value === 'transparent') {
      return this.transparentOption;
    }
    return allColors.find(color => color.value === value || color.hex === value) || null;
  }

  private openColorPicker(): void {
    // Create a hidden color input for custom color selection
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.style.position = 'absolute';
    colorInput.style.left = '-9999px';
    colorInput.value = this.currentColor.hex === 'transparent' ? '#000000' : this.currentColor.hex;
    
    document.body.appendChild(colorInput);
    
    colorInput.addEventListener('change', () => {
      const customColor: ColorOption = {
        name: 'Custom',
        value: colorInput.value,
        hex: colorInput.value
      };
      
      // Add to document colors if not already there
      if (!this.documentColors.find(c => c.hex === customColor.hex)) {
        this.documentColors.push(customColor);
        // Recreate dropdown to include new color
        this.dropdown.remove();
        this.createDropdown();
      }
      
      this.selectColor(customColor);
      document.body.removeChild(colorInput);
    });
    
    colorInput.click();
  }

  // Public methods
  public getValue(): string {
    return this.currentColor.value;
  }

  public setValue(value: string): void {
    const color = this.findColorByValue(value);
    if (color) {
      this.selectColor(color);
    }
  }

  public destroy(): void {
    if (this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }
    // Remove event listeners
    document.removeEventListener('click', this.closeDropdown);
    document.removeEventListener('keydown', this.closeDropdown);
  }
}