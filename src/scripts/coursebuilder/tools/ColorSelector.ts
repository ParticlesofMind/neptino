/**
 * ColorSelector - A beautiful dropdown color picker for coursebuilder tools
 * Provides a clean interface for selecting from Neptino's desaturated color palette
 */

export interface ColorOption {
  name: string;
  value: string;
  hex: string;
}

export class ColorSelector {
  private container: HTMLElement;
  private dropdown: HTMLElement | null = null;
  private currentColor: ColorOption;
  private onColorChange: (color: ColorOption) => void;
  private isOpen: boolean = false;

  // Neptino's desaturated color palette (most to least used)
  private colors: ColorOption[] = [
    { name: '', value: 'black', hex: '#1a1a1a' },
    { name: '', value: 'green', hex: '#4a7c59' },
    { name: '', value: 'blue', hex: '#4a79a4' },
    { name: '', value: 'red', hex: '#a74a4a' },
    { name: '', value: 'gray', hex: '#6b7280' },
    { name: '', value: 'orange', hex: '#b87333' },
    { name: '', value: 'purple', hex: '#7c5a9b' },
    { name: '', value: 'yellow', hex: '#b8a642' },
    { name: '', value: 'slate', hex: '#64748b' },
    { name: '', value: 'white', hex: '#f8fafc' }
  ];

  constructor(
    container: HTMLElement,
    initialColor: string = '#1a1a1a',
    onColorChange: (color: ColorOption) => void
  ) {
    this.container = container;
    this.onColorChange = onColorChange;
    this.currentColor = this.colors.find(c => c.hex === initialColor) || this.colors[0];
    this.init();
  }

  private init(): void {
    this.createColorButton();
    this.createDropdown();
    this.bindEvents();
  }

  private createColorButton(): void {
    const button = document.createElement('button');
    button.className = 'color-button';
    button.type = 'button';
    button.setAttribute('aria-label', `Current color: ${this.currentColor.name}`);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-haspopup', 'true');

    button.innerHTML = `
      <div class="color-preview" style="background-color: ${this.currentColor.hex}"></div>
      <span class="color-name">${this.currentColor.name}</span>
      <svg class="color-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;

    this.container.appendChild(button);
  }

  private createDropdown(): void {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'color-menu';
    this.dropdown.setAttribute('role', 'listbox');
    this.dropdown.setAttribute('aria-label', 'Color options');

    this.colors.forEach((color) => {
      const option = document.createElement('button');
      option.className = 'color-option';
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', color.hex === this.currentColor.hex ? 'true' : 'false');
      option.setAttribute('data-color', color.value);
      option.setAttribute('data-hex', color.hex);

      option.innerHTML = `
        <div class="color-swatch" style="background-color: ${color.hex}"></div>
        <span class="color-label">${color.name}</span>
        ${color.hex === this.currentColor.hex ? '<svg class="color-check" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.485 3.495a.75.75 0 011.06 1.06l-7 7a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06L6.97 9.44l6.515-5.945z"/></svg>' : ''}
      `;

      option.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectColor(color);
      });

      this.dropdown?.appendChild(option);
    });

    // Append to body to avoid parent container constraints
    document.body.appendChild(this.dropdown);
  }

  private bindEvents(): void {
    const button = this.container.querySelector('.color-button') as HTMLButtonElement;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node) && !this.dropdown?.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });

    // Reposition dropdown on window resize
    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.positionDropdown();
      }
    });

    // Keyboard navigation
    button.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
        case 'ArrowDown':
          e.preventDefault();
          this.openDropdown();
          this.focusFirstOption();
          break;
        case 'Escape':
          this.closeDropdown();
          break;
      }
    });

    if (this.dropdown) {
      this.dropdown.addEventListener('keydown', (e) => {
        this.handleDropdownKeydown(e);
      });
    }
  }

  private handleDropdownKeydown(e: KeyboardEvent): void {
    const options = Array.from(this.dropdown?.querySelectorAll('.color-option') || []) as HTMLButtonElement[];
    const currentIndex = options.findIndex(opt => opt === document.activeElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        options[nextIndex].focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        options[prevIndex].focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        (e.target as HTMLButtonElement).click();
        break;
      case 'Escape':
        this.closeDropdown();
        (this.container.querySelector('.color-button') as HTMLButtonElement).focus();
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
    if (!this.dropdown) return;

    this.isOpen = true;
    this.dropdown.classList.add('color-menu--open');

    const button = this.container.querySelector('.color-button') as HTMLButtonElement;
    button.setAttribute('aria-expanded', 'true');
    button.classList.add('color-button--open');

    // Position dropdown relative to button using fixed positioning
    this.positionDropdown();
  }

  private positionDropdown(): void {
    if (!this.dropdown) return;

    const button = this.container.querySelector('.color-button') as HTMLButtonElement;
    const buttonRect = button.getBoundingClientRect();

    // Position dropdown right below the button
    this.dropdown.style.position = 'fixed';
    this.dropdown.style.top = `${buttonRect.bottom + 4}px`;
    this.dropdown.style.left = `${buttonRect.left}px`;
    this.dropdown.style.width = `${buttonRect.width}px`;
    this.dropdown.style.zIndex = '10000';
  }

  private closeDropdown(): void {
    if (!this.dropdown) return;

    this.isOpen = false;
    this.dropdown.classList.remove('color-menu--open');

    const button = this.container.querySelector('.color-button') as HTMLButtonElement;
    button.setAttribute('aria-expanded', 'false');
    button.classList.remove('color-button--open');
  }

  private focusFirstOption(): void {
    if (!this.dropdown) return;

    const firstOption = this.dropdown.querySelector('.color-option') as HTMLButtonElement;
    if (firstOption) {
      firstOption.focus();
    }
  }

  private selectColor(color: ColorOption): void {
    this.currentColor = color;
    this.updateButton();
    this.updateDropdownSelection();
    this.closeDropdown();
    this.onColorChange(color);
  }

  private updateButton(): void {
    const button = this.container.querySelector('.color-button') as HTMLButtonElement;
    const preview = button.querySelector('.color-preview') as HTMLElement;
    const name = button.querySelector('.color-name') as HTMLElement;

    if (preview && name) {
      preview.style.backgroundColor = this.currentColor.hex;
      name.textContent = this.currentColor.name;
      button.setAttribute('aria-label', `Current color: ${this.currentColor.name}`);
    }
  }

  private updateDropdownSelection(): void {
    if (!this.dropdown) return;

    const options = this.dropdown.querySelectorAll('.color-option');
    options.forEach((option) => {
      const isSelected = option.getAttribute('data-hex') === this.currentColor.hex;
      option.setAttribute('aria-selected', isSelected ? 'true' : 'false');

      // Update check mark
      const existingCheck = option.querySelector('.color-check');
      if (existingCheck) {
        existingCheck.remove();
      }

      if (isSelected) {
        const check = document.createElement('svg');
        check.className = 'color-check';
        check.setAttribute('width', '16');
        check.setAttribute('height', '16');
        check.setAttribute('viewBox', '0 0 16 16');
        check.setAttribute('fill', 'currentColor');
        check.innerHTML = '<path d="M13.485 3.495a.75.75 0 011.06 1.06l-7 7a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06L6.97 9.44l6.515-5.945z"/>';
        option.appendChild(check);
      }
    });
  }

  // Public methods
  public getCurrentColor(): ColorOption {
    return this.currentColor;
  }

  public setColor(hex: string): void {
    const color = this.colors.find(c => c.hex === hex);
    if (color) {
      this.selectColor(color);
    }
  }

  public destroy(): void {
    // Remove event listeners
    const closeHandler = (e: Event) => {
      if (!this.container.contains(e.target as Node) && !this.dropdown?.contains(e.target as Node)) {
        this.closeDropdown();
      }
    };
    document.removeEventListener('click', closeHandler);

    const resizeHandler = () => {
      if (this.isOpen) {
        this.positionDropdown();
      }
    };
    window.removeEventListener('resize', resizeHandler);

    // Remove dropdown from body
    if (this.dropdown && this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }

    // Clear container
    this.container.innerHTML = '';
  }
}
