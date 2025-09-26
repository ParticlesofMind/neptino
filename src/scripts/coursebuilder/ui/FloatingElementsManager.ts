/**
 * FloatingElementsManager - Manages positioning of floating UI elements
 * that need to stay fixed relative to the viewport while inside scrollable containers
 */

export class FloatingElementsManager {
    public perspectiveElement: HTMLElement | null = null;
    public controlsElement: HTMLElement | null = null;
    public canvasElement: HTMLElement | null = null;
    public engineElement: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | null = null;

    constructor() {
        this.initializeElements();
        this.setupResizeObserver();
        this.positionElements();
        
        // Update positions on window resize
        window.addEventListener('resize', () => this.positionElements());
    }

    private initializeElements(): void {
        this.perspectiveElement = document.querySelector('.engine__perspective');
        this.controlsElement = document.querySelector('.engine__controls');
        this.canvasElement = document.querySelector('.engine__canvas');
        this.engineElement = document.querySelector('.engine');

        if (!this.perspectiveElement || !this.controlsElement || !this.canvasElement || !this.engineElement) {
            console.warn('FloatingElementsManager: Some required elements not found');
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

    public positionElements(): void {
        if (!this.engineElement || !this.canvasElement) return;

        const canvasRect = this.canvasElement.getBoundingClientRect();

        // Position perspective tools on the left side of the canvas
        if (this.perspectiveElement) {
            const perspectiveLeft = canvasRect.left + 16; // 1rem margin from canvas edge
            const perspectiveTop = canvasRect.top + (canvasRect.height / 2);

            this.perspectiveElement.style.position = 'fixed';
            this.perspectiveElement.style.left = `${perspectiveLeft}px`;
            this.perspectiveElement.style.top = `${perspectiveTop}px`;
            this.perspectiveElement.style.transform = 'translateY(-50%)';
            this.perspectiveElement.style.zIndex = '100';
        }

        // Position controls at the bottom center of the canvas
        if (this.controlsElement) {
            const controlsLeft = canvasRect.left + (canvasRect.width / 2);
            const controlsBottom = window.innerHeight - canvasRect.bottom + 16; // 1rem margin from canvas bottom

            this.controlsElement.style.position = 'fixed';
            this.controlsElement.style.left = `${controlsLeft}px`;
            this.controlsElement.style.bottom = `${controlsBottom}px`;
            this.controlsElement.style.transform = 'translateX(-50%)';
            this.controlsElement.style.zIndex = '100';
        }
    }

    public destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        window.removeEventListener('resize', () => this.positionElements());
    }
}