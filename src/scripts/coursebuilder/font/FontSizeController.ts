/**
 * Font Size Controller - Font size management only
 */

export class FontSizeController {
  private currentSize: number = 16;
  private minSize: number = 8;
  private maxSize: number = 72;
  private sizeOptions: number[] = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];
  private onSizeChangeCallback: ((size: number) => void) | null = null;

  constructor() {
    this.bindEvents();
    this.updateUI();
  }

  setOnSizeChange(callback: (size: number) => void): void {
    this.onSizeChangeCallback = callback;
  }

  private bindEvents(): void {
    const increaseBtns = document.querySelectorAll('[data-font-action="increase"]');
    const decreaseBtns = document.querySelectorAll('[data-font-action="decrease"]');
    increaseBtns.forEach(btn => btn.addEventListener('click', () => this.increaseSize()));
    decreaseBtns.forEach(btn => btn.addEventListener('click', () => this.decreaseSize()));

    const sizeSelects = document.querySelectorAll('select[data-font-property="size"]');
    sizeSelects.forEach(select => {
      select.addEventListener('change', (e) => this.handleSizeSelect(e));
    });

    const sizeInputs = document.querySelectorAll('input[data-font-property="size"]');
    sizeInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handleSizeInput(e));
      input.addEventListener('blur', (e) => this.handleSizeBlur(e));
    });

    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    if ((event.ctrlKey || event.metaKey)) {
      if (event.key === '=') {
        event.preventDefault();
        this.increaseSize();
      } else if (event.key === '-') {
        event.preventDefault();
        this.decreaseSize();
      }
    }
  }

  private handleSizeSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = parseInt(target.value);
    if (!isNaN(newSize)) {
      this.setSize(newSize);
    }
  }

  private handleSizeInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();
    if (value === '') return;
    
    const newSize = parseInt(value);
    if (!isNaN(newSize) && newSize !== this.currentSize) {
      const clampedSize = Math.min(Math.max(newSize, this.minSize), this.maxSize);
      if (clampedSize !== newSize) {
        target.value = clampedSize.toString();
      }
      this.setSize(clampedSize);
    }
  }

  private handleSizeBlur(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.value.trim() === '') {
      target.value = this.currentSize.toString();
    }
  }

  increaseSize(): void {
    const currentIndex = this.sizeOptions.indexOf(this.currentSize);
    if (currentIndex !== -1 && currentIndex < this.sizeOptions.length - 1) {
      this.setSize(this.sizeOptions[currentIndex + 1]);
    } else {
      this.setSize(Math.min(this.currentSize + 2, this.maxSize));
    }
  }

  decreaseSize(): void {
    const currentIndex = this.sizeOptions.indexOf(this.currentSize);
    if (currentIndex > 0) {
      this.setSize(this.sizeOptions[currentIndex - 1]);
    } else {
      this.setSize(Math.max(this.currentSize - 2, this.minSize));
    }
  }

  setSize(size: number): void {
    const clampedSize = Math.min(Math.max(size, this.minSize), this.maxSize);
    if (clampedSize === this.currentSize) return;

    this.currentSize = clampedSize;
    this.updateUI();
    
    if (this.onSizeChangeCallback) {
      this.onSizeChangeCallback(this.currentSize);
    }
  }

  private updateUI(): void {
    const selects = document.querySelectorAll('select[data-font-property="size"]') as NodeListOf<HTMLSelectElement>;
    selects.forEach(select => {
      if (!select.querySelector(`option[value="${this.currentSize}"]`)) {
        const option = document.createElement('option');
        option.value = this.currentSize.toString();
        option.textContent = this.currentSize.toString();
        select.appendChild(option);
      }
      select.value = this.currentSize.toString();
    });

    const inputs = document.querySelectorAll('input[data-font-property="size"]') as NodeListOf<HTMLInputElement>;
    inputs.forEach(input => {
      input.value = this.currentSize.toString();
    });

    const displays = document.querySelectorAll('[data-font-size-display]');
    displays.forEach(display => {
      display.textContent = `${this.currentSize}px`;
    });
  }

  private populateSizeOptions(select: HTMLSelectElement): void {
    select.innerHTML = '';
    this.sizeOptions.forEach(size => {
      const option = document.createElement('option');
      option.value = size.toString();
      option.textContent = size.toString();
      if (size === this.currentSize) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  getCurrentSize(): number {
    return this.currentSize;
  }

  getSizeOptions(): number[] {
    return [...this.sizeOptions];
  }

  getMinSize(): number {
    return this.minSize;
  }

  getMaxSize(): number {
    return this.maxSize;
  }

  setMinSize(size: number): void {
    this.minSize = Math.max(1, size);
    if (this.currentSize < this.minSize) {
      this.setSize(this.minSize);
    }
  }

  setMaxSize(size: number): void {
    this.maxSize = Math.max(this.minSize, size);
    if (this.currentSize > this.maxSize) {
      this.setSize(this.maxSize);
    }
  }

  setSizeOptions(options: number[]): void {
    this.sizeOptions = options.sort((a, b) => a - b);
    this.updateUI();
  }

  reset(): void {
    this.setSize(16);
  }

  destroy(): void {
    const increaseBtns = document.querySelectorAll('[data-font-action="increase"]');
    const decreaseBtns = document.querySelectorAll('[data-font-action="decrease"]');
    const selects = document.querySelectorAll('select[data-font-property="size"]');
    const inputs = document.querySelectorAll('input[data-font-property="size"]');

    [...increaseBtns, ...decreaseBtns].forEach(btn => {
      btn.removeEventListener('click', () => this.increaseSize());
    });
    
    selects.forEach(select => {
      select.removeEventListener('change', this.handleSizeSelect);
    });
    
    inputs.forEach(input => {
      input.removeEventListener('input', this.handleSizeInput);
      input.removeEventListener('blur', this.handleSizeBlur);
    });
    
    document.removeEventListener('keydown', this.handleKeyboardShortcuts);
    this.onSizeChangeCallback = null;
  }
}
