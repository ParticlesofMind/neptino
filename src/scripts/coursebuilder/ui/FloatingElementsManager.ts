/**
 * FloatingElementsManager - Manages positioning of floating UI elements
 * that need to stay fixed relative to the viewport while inside scrollable containers
 */

export class FloatingElementsManager {
    public perspectiveElement: HTMLElement | null = null;
    public controlsElement: HTMLElement | null = null;
    public canvasElement: HTMLElement | null = null;
    public engineElement: HTMLElement | null = null;
    public snapMenuElement: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | null = null;

    constructor() {
        this.initializeElements();
        this.setupResizeObserver();
        this.setupSnapMenuObserver();
        this.positionElements();
        
        // Update positions on window resize
        window.addEventListener('resize', () => this.positionElements());
    }

    private initializeElements(): void {
        this.perspectiveElement = document.querySelector('.engine__perspective');
        this.controlsElement = document.querySelector('.engine__controls');
        this.canvasElement = document.querySelector('.engine__canvas');
        this.engineElement = document.querySelector('.engine');
        this.snapMenuElement = document.querySelector('[data-snap-menu]');

        if (!this.perspectiveElement || !this.controlsElement || !this.canvasElement || !this.engineElement) {
            console.warn('FloatingElementsManager: Some required elements not found');
        }
        
        if (!this.snapMenuElement) {
            console.warn('FloatingElementsManager: Snap menu element not found');
        }
    }

    private setupResizeObserver(): void {
        if ('ResizeObserver' in window && this.engineElement) {
            this.resizeObserver = new ResizeObserver(() => {
                this.positionElements();
            });
            this.resizeObserver.observe(this.engineElement);
        }
    }

    private setupSnapMenuObserver(): void {
        if (!this.snapMenuElement) return;

        // Use MutationObserver to watch for class changes on the snap menu
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // Snap menu visibility changed, reposition it
                    this.positionSnapMenu();
                }
            });
        });

        observer.observe(this.snapMenuElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    public positionElements(): void {
        if (!this.engineElement || !this.canvasElement) return;

        const canvasRect = this.canvasElement.getBoundingClientRect();

        // Position perspective tools on the RIGHT side of the canvas
        if (this.perspectiveElement) {
            const perspectiveRight = window.innerWidth - canvasRect.right + 16; // 1rem margin from canvas edge
            const perspectiveTop = canvasRect.top + (canvasRect.height / 2);

            this.perspectiveElement.style.position = 'fixed';
            this.perspectiveElement.style.right = `${perspectiveRight}px`;
            this.perspectiveElement.style.left = 'auto';
            this.perspectiveElement.style.top = `${perspectiveTop}px`;
            this.perspectiveElement.style.transform = 'translateY(-50%)';
            this.perspectiveElement.style.zIndex = '100';
        }

        // Position controls on the LEFT side of the canvas
        if (this.controlsElement) {
            const controlsLeft = canvasRect.left + 4; // Small margin from canvas edge
            const controlsTop = canvasRect.top + (canvasRect.height / 2);

            this.controlsElement.style.position = 'fixed';
            this.controlsElement.style.left = `${controlsLeft}px`;
            this.controlsElement.style.right = 'auto';
            this.controlsElement.style.top = `${controlsTop}px`;
            this.controlsElement.style.transform = 'translateY(-50%)';
            this.controlsElement.style.zIndex = '100';
        }

        // Position snap menu next to perspective tools (only if it's open/visible)
        this.positionSnapMenu();
    }

    public positionSnapMenu(): void {
        if (!this.snapMenuElement || !this.perspectiveElement) return;

        // Only position if the menu is open/visible
        if (!this.snapMenuElement.classList.contains('snap-menu--open')) {
            return;
        }

        const perspectiveRect = this.perspectiveElement.getBoundingClientRect();
        
        // Position to the right of perspective tools with 8px margin
        let snapMenuLeft = perspectiveRect.right + 8;
        let snapMenuTop = perspectiveRect.top;

        // Ensure the menu stays within the viewport
        const menuWidth = 200; // Approximate width from CSS
        const menuHeight = 300; // Approximate height
        
        // Adjust horizontal position if it would go off-screen
        if (snapMenuLeft + menuWidth > window.innerWidth) {
            snapMenuLeft = perspectiveRect.left - menuWidth - 8; // Position to the left instead
        }
        
        // Adjust vertical position if it would go off-screen
        if (snapMenuTop + menuHeight > window.innerHeight) {
            snapMenuTop = window.innerHeight - menuHeight - 16;
        }
        
        // Ensure it doesn't go above the top of the screen
        snapMenuTop = Math.max(16, snapMenuTop);

        this.snapMenuElement.style.position = 'fixed';
        this.snapMenuElement.style.left = `${snapMenuLeft}px`;
        this.snapMenuElement.style.top = `${snapMenuTop}px`;
        this.snapMenuElement.style.zIndex = '1001';
        
        console.log('Snap menu positioned:', { left: snapMenuLeft, top: snapMenuTop, perspectiveRect });
    }

    public destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        window.removeEventListener('resize', () => this.positionElements());
    }
}