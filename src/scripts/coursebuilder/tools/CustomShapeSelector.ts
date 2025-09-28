/**
 * CustomShapeSelector - Replace Select2 shape dropdown with custom component
 * Provides a clean interface for selecting shapes with a popup card
 */

interface ShapeOption {
  name: string;
  value: string;
  icon: string;
}

export class CustomShapeSelector {
  private container: HTMLElement;
  private trigger!: HTMLButtonElement;
  private dropdown!: HTMLElement;
  private currentShape: ShapeOption;
  private onShapeChange: (shape: ShapeOption) => void;
  private isOpen: boolean = false;

  // Available shapes
  private shapes: ShapeOption[] = [
    // Basic 2D shapes
    { 
      name: 'Rectangle', 
      value: 'rectangle', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-rectangle.svg' 
    },
    { 
      name: 'Square', 
      value: 'square', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-square.svg' 
    },
    { 
      name: 'Triangle', 
      value: 'triangle', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-triangle.svg' 
    },
    { 
      name: 'Circle', 
      value: 'circle', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-circle.svg' 
    },
    { 
      name: 'Ellipse', 
      value: 'ellipse', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-ellipse.svg' 
    },
    
    // Quadrilaterals
    { 
      name: 'Rhombus', 
      value: 'rhombus', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-rhombus.svg' 
    },
    { 
      name: 'Parallelogram', 
      value: 'parallelogram', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-parallelogram.svg' 
    },
    { 
      name: 'Trapezoid', 
      value: 'trapezoid', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-trapezoid.svg' 
    },
    
    // Polygons
    { 
      name: 'Pentagon', 
      value: 'pentagon', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-pentagon.svg' 
    },
    { 
      name: 'Hexagon', 
      value: 'hexagon', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-hexagon.svg' 
    },
    { 
      name: 'Octagon', 
      value: 'octagon', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-octagon.svg' 
    },
    { 
      name: 'Star', 
      value: 'star', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-star.svg' 
    },
    
    // 3D shapes
    { 
      name: 'Sphere', 
      value: 'sphere', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-sphere.svg' 
    },
    { 
      name: 'Cube', 
      value: 'cube', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-cube.svg' 
    },
    { 
      name: 'Cuboid', 
      value: 'cuboid', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-cuboid.svg' 
    },
    { 
      name: 'Cylinder', 
      value: 'cylinder', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-cylinder.svg' 
    },
    { 
      name: 'Cone', 
      value: 'cone', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-cone.svg' 
    },
    { 
      name: 'Pyramid', 
      value: 'pyramid', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-pyramid.svg' 
    },
    { 
      name: 'Torus', 
      value: 'torus', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-torus.svg' 
    },
    { 
      name: 'Prism', 
      value: 'prism', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-prism.svg' 
    },
    
    // Lines and arrows
    { 
      name: 'Line', 
      value: 'line', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-line.svg' 
    },
    { 
      name: 'Arrow', 
      value: 'arrow', 
      icon: '/src/assets/icons/coursebuilder/tools/shapes/shape-arrow.svg' 
    }
  ];

  constructor(
    container: HTMLElement,
    initialShape: string = 'rectangle',
    onShapeChange: (shape: ShapeOption) => void
  ) {
    this.container = container;
    this.onShapeChange = onShapeChange;
    
    // Find initial shape in palette
    this.currentShape = this.findShapeByValue(initialShape) || this.shapes[0];
    
    this.init();
  }

  private init(): void {
    this.createTrigger();
    this.createDropdown();
    this.bindEvents();
  }

  private createTrigger(): void {
    this.trigger = document.createElement('button') as HTMLButtonElement;
    this.trigger.className = 'shape-selector__trigger';
    this.trigger.type = 'button';
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.setAttribute('aria-haspopup', 'true');
    this.trigger.setAttribute('aria-label', `Selected shape: ${this.currentShape.name}`);

    const icon = document.createElement('img');
    icon.className = 'shape-selector__trigger-icon';
    icon.src = this.currentShape.icon;
    icon.alt = this.currentShape.name;

    this.trigger.appendChild(icon);
    this.container.appendChild(this.trigger);
  }

  private createDropdown(): void {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'shape-selector__dropdown';
    this.dropdown.setAttribute('role', 'listbox');
    this.dropdown.setAttribute('aria-label', 'Shape options');

    // Title
    const title = document.createElement('div');
    title.className = 'shape-selector__title';
    title.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      </svg>
      <span>Choose Shape</span>
    `;
    this.dropdown.appendChild(title);

    // Shapes grid
    const grid = document.createElement('div');
    grid.className = 'shape-selector__grid';

    this.shapes.forEach((shape) => {
      const shapeEl = document.createElement('button');
      shapeEl.className = 'shape-selector__shape';
      shapeEl.type = 'button';
      shapeEl.setAttribute('role', 'option');
      shapeEl.setAttribute('aria-selected', shape.value === this.currentShape.value ? 'true' : 'false');
      shapeEl.setAttribute('data-shape', shape.value);
      shapeEl.setAttribute('aria-label', shape.name);

      if (shape.value === this.currentShape.value) {
        shapeEl.classList.add('shape-selector__shape--selected');
      }

      const shapeIcon = document.createElement('img');
      shapeIcon.className = 'shape-selector__shape-icon';
      shapeIcon.src = shape.icon;
      shapeIcon.alt = shape.name;

      const shapeLabel = document.createElement('span');
      shapeLabel.className = 'shape-selector__shape-label';
      shapeLabel.textContent = shape.name;

      shapeEl.appendChild(shapeIcon);
      shapeEl.appendChild(shapeLabel);

      shapeEl.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectShape(shape);
      });

      grid.appendChild(shapeEl);
    });

    this.dropdown.appendChild(grid);

    // Append to body to avoid parent container constraints
    document.body.appendChild(this.dropdown);
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
    const shapes = Array.from(this.dropdown.querySelectorAll('.shape-selector__shape')) as HTMLButtonElement[];
    const currentIndex = shapes.findIndex(shape => shape === document.activeElement);

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = currentIndex < shapes.length - 1 ? currentIndex + 1 : 0;
        shapes[nextIndex].focus();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : shapes.length - 1;
        shapes[prevIndex].focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        // Move to next row (3 shapes per row)
        const nextRowIndex = Math.min(currentIndex + 3, shapes.length - 1);
        shapes[nextRowIndex].focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Move to previous row
        const prevRowIndex = Math.max(currentIndex - 3, 0);
        shapes[prevRowIndex].focus();
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
    this.dropdown.classList.add('shape-selector__dropdown--open');
    this.trigger.classList.add('shape-selector__trigger--active');
    this.trigger.setAttribute('aria-expanded', 'true');

    // Position dropdown relative to trigger
    this.positionDropdown();

    // Focus first shape option
    const firstShape = this.dropdown.querySelector('.shape-selector__shape') as HTMLButtonElement;
    if (firstShape) {
      firstShape.focus();
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
    this.dropdown.classList.remove('shape-selector__dropdown--open');
    this.trigger.classList.remove('shape-selector__trigger--active');
    this.trigger.setAttribute('aria-expanded', 'false');
  }

  private selectShape(shape: ShapeOption): void {
    this.currentShape = shape;
    this.updateTrigger();
    this.updateDropdownSelection();
    this.onShapeChange(shape);
    this.closeDropdown();
  }

  private updateTrigger(): void {
    const icon = this.trigger.querySelector('.shape-selector__trigger-icon') as HTMLImageElement;
    
    // Update icon
    icon.src = this.currentShape.icon;
    icon.alt = this.currentShape.name;

    // Update aria label
    this.trigger.setAttribute('aria-label', `Selected shape: ${this.currentShape.name}`);
  }

  private updateDropdownSelection(): void {
    // Remove all selected states
    const allShapes = this.dropdown.querySelectorAll('.shape-selector__shape');
    allShapes.forEach((shape) => {
      shape.classList.remove('shape-selector__shape--selected');
      shape.setAttribute('aria-selected', 'false');
    });

    // Add selected state to current shape
    const selectedShape = this.dropdown.querySelector(`[data-shape="${this.currentShape.value}"]`);
    if (selectedShape) {
      selectedShape.classList.add('shape-selector__shape--selected');
      selectedShape.setAttribute('aria-selected', 'true');
    }
  }

  private findShapeByValue(value: string): ShapeOption | null {
    return this.shapes.find(shape => shape.value === value) || null;
  }

  // Public methods
  public getValue(): string {
    return this.currentShape.value;
  }

  public setValue(value: string): void {
    const shape = this.findShapeByValue(value);
    if (shape) {
      this.selectShape(shape);
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