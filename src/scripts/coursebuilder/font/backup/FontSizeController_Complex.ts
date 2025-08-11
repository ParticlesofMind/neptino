/**
 * Font Size Controller
 * Manages font size controls, validation, and size-related UI operations
 * Single Responsibility: Font size management only
 */

export class FontSizeController {
  private currentSize: number = 16;
  private minSize: number = 8;
  private maxSize: number = 100;
  private onSizeChangeCallback: ((size: number) => void) | null = null;

  constructor() {
    this.bindSizeEvents();
    this.initializeFontSize();
  }

  /**
   * Set callback for size changes
   */
  setOnSizeChange(callback: (size: number) => void): void {
    this.onSizeChangeCallback = callback;
  }

  /**
   * Initialize font size from input
   */
  private initializeFontSize(): void {
    const fontSizeInput = document.getElementById('font-size') as HTMLInputElement;
    if (fontSizeInput) {
      const inputValue = parseInt(fontSizeInput.value) || this.currentSize;
      this.currentSize = this.clampSize(inputValue);
      fontSizeInput.value = this.currentSize.toString();
    }
  }

  /**
   * Bind font size events
   */
  private bindSizeEvents(): void {
    const fontSizeInput = document.getElementById('font-size') as HTMLInputElement;
    if (fontSizeInput) {
      fontSizeInput.addEventListener('input', this.handleSizeInput.bind(this));
      fontSizeInput.addEventListener('change', this.handleSizeChange.bind(this));
      fontSizeInput.addEventListener('blur', this.handleSizeBlur.bind(this));
    }

    // Font size buttons
    const increaseSizeBtn = document.getElementById('increase-font-size');
    const decreaseSizeBtn = document.getElementById('decrease-font-size');
    
    if (increaseSizeBtn) {
      increaseSizeBtn.addEventListener('click', this.increaseFontSize.bind(this));
    }
    
    if (decreaseSizeBtn) {
      decreaseSizeBtn.addEventListener('click', this.decreaseFontSize.bind(this));
    }

    // Keyboard shortcuts
    this.bindKeyboardShortcuts();
  }

  /**
   * Bind keyboard shortcuts for font size
   */
  private bindKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // Only handle shortcuts if not in input field
      if (document.activeElement?.tagName === 'INPUT' && 
          document.activeElement.id !== 'font-size') {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '=':
          case '+':
            event.preventDefault();
            this.increaseFontSize();
            break;
          case '-':
            event.preventDefault();
            this.decreaseFontSize();
            break;
        }
      }
    });
  }

  /**
   * Handle font size input (real-time)
   */
  private handleSizeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value;
    
    // Allow empty input during typing
    if (rawValue === '') return;
    
    const numValue = parseInt(rawValue);
    if (!isNaN(numValue)) {
      const clampedValue = this.clampSize(numValue);
      
      // Only trigger change if value is different
      if (clampedValue !== this.currentSize) {
        this.currentSize = clampedValue;
        this.triggerSizeChange();
      }
    }
  }

  /**
   * Handle font size change (on blur/enter)
   */
  private handleSizeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numValue = parseInt(input.value) || this.currentSize;
    
    this.setSize(numValue);
  }

  /**
   * Handle font size input blur
   */
  private handleSizeBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    // Ensure input shows current size
    input.value = this.currentSize.toString();
  }

  /**
   * Increase font size
   */
  increaseFontSize(): void {
    const increment = this.getSizeIncrement();
    this.setSize(this.currentSize + increment);
  }

  /**
   * Decrease font size
   */
  decreaseFontSize(): void {
    const decrement = this.getSizeDecrement();
    this.setSize(this.currentSize - decrement);
  }

  /**
   * Get size increment based on current size
   */
  private getSizeIncrement(): number {
    if (this.currentSize < 24) return 2;
    return 4;
  }

  /**
   * Get size decrement based on current size
   */
  private getSizeDecrement(): number {
    if (this.currentSize <= 24) return 2;
    return 4;
  }

  /**
   * Set font size with validation
   */
  setSize(size: number): void {
    const clampedSize = this.clampSize(size);
    
    if (clampedSize !== this.currentSize) {
      this.currentSize = clampedSize;
      this.updateSizeInput();
      this.triggerSizeChange();
      
      console.log('📏 Font size changed to:', this.currentSize);
    }
  }

  /**
   * Clamp size to valid range
   */
  private clampSize(size: number): number {
    return Math.max(this.minSize, Math.min(this.maxSize, size));
  }

  /**
   * Update size input element
   */
  private updateSizeInput(): void {
    const fontSizeInput = document.getElementById('font-size') as HTMLInputElement;
    if (fontSizeInput) {
      fontSizeInput.value = this.currentSize.toString();
    }
  }

  /**
   * Trigger size change callback and event
   */
  private triggerSizeChange(): void {
    // Trigger callback
    if (this.onSizeChangeCallback) {
      this.onSizeChangeCallback(this.currentSize);
    }

    // Emit custom event
    const sizeChangeEvent = new CustomEvent('fontSizeChange', {
      detail: { size: this.currentSize }
    });
    document.dispatchEvent(sizeChangeEvent);
  }

  /**
   * Get current font size
   */
  getCurrentSize(): number {
    return this.currentSize;
  }

  /**
   * Set size limits
   */
  setSizeLimits(min: number, max: number): void {
    this.minSize = Math.max(1, min);
    this.maxSize = Math.max(this.minSize, max);
    
    // Re-validate current size
    this.setSize(this.currentSize);
  }

  /**
   * Get size limits
   */
  getSizeLimits(): { min: number; max: number } {
    return { min: this.minSize, max: this.maxSize };
  }

  /**
   * Reset to default size
   */
  resetToDefault(): void {
    this.setSize(16);
  }

  /**
   * Get relative size description
   */
  getSizeDescription(): string {
    if (this.currentSize <= 12) return 'Small';
    if (this.currentSize <= 18) return 'Normal';
    if (this.currentSize <= 24) return 'Large';
    return 'Extra Large';
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.onSizeChangeCallback = null;
  }
}
