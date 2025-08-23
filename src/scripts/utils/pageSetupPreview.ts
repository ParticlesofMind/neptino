// ==========================================================================
// PAGE SETUP CANVAS PREVIEW - Interactive margin visualization
// ==========================================================================

interface PaperSize {
    width: number;
    height: number;
    name: string;
}

interface Margins {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

class PageSetupPreview {
    private canvas: HTMLCanvasElement | null;
    private ctx: CanvasRenderingContext2D | null;
    private dimensionsEl: HTMLElement | null;
    private marginsInfoEl: HTMLElement | null;
    
    // Paper dimensions in mm
    private paperSizes: Record<string, PaperSize> = {
        'a4': { width: 210, height: 297, name: 'A4' },
        'us-letter': { width: 216, height: 279, name: 'US Letter' },
        'a3': { width: 297, height: 420, name: 'A3' }
    };
    
    // Current settings
    private currentSize: string = 'a4';
    private currentOrientation: string = 'portrait';
    private margins: Margins = {
        top: 25,
        bottom: 25,
        left: 25,
        right: 25
    };
    
    constructor() {
        this.canvas = document.getElementById('page-preview-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas?.getContext('2d') || null;
        this.dimensionsEl = document.getElementById('canvas-dimensions');
        this.marginsInfoEl = document.getElementById('margins-info');
        
        this.init();
    }
    
    private init(): void {
        if (!this.canvas || !this.ctx) return;
        this.bindEvents();
        this.updatePreview();
    }
    
    private bindEvents(): void {
        // Canvas size change
        document.querySelectorAll('input[name="canvas-size"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.currentSize = target.value;
                this.updatePreview();
            });
        });
        
        // Orientation change
        document.querySelectorAll('input[name="orientation"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.currentOrientation = target.value;
                this.updatePreview();
            });
        });
        
        // Margin changes
        (['margin_top', 'margin_bottom', 'margin_left', 'margin_right'] as const).forEach(name => {
            const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
            if (input) {
                input.addEventListener('input', (e) => {
                    const target = e.target as HTMLInputElement;
                    const marginType = name.split('_')[1] as keyof Margins;
                    this.margins[marginType] = parseFloat(target.value) || 0;
                    this.updatePreview();
                });
            }
        });
    }
    
    private updatePreview(): void {
        this.clearCanvas();
        this.drawPage();
        this.updateInfo();
    }
    
    private clearCanvas(): void {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    private drawPage(): void {
        if (!this.ctx || !this.canvas) return;
        
        const paper = this.paperSizes[this.currentSize];
        let width: number, height: number;
        
        // Apply orientation
        if (this.currentOrientation === 'portrait') {
            width = paper.width;
            height = paper.height;
        } else {
            width = paper.height;
            height = paper.width;
        }
        
        // Calculate scale to fit canvas with some padding
        const canvasWidth = this.canvas.width - 40; // 20px padding each side
        const canvasHeight = this.canvas.height - 40;
        
        const scaleX = canvasWidth / width;
        const scaleY = canvasHeight / height;
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        
        // Center the page
        const offsetX = (this.canvas.width - scaledWidth) / 2;
        const offsetY = (this.canvas.height - scaledHeight) / 2;
        
        // Draw paper background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(offsetX, offsetY, scaledWidth, scaledHeight);
        
        // Draw paper border
        this.ctx.strokeStyle = '#cccccc';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(offsetX, offsetY, scaledWidth, scaledHeight);
        
        // Draw margins (blue overlay)
        this.ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // Blue with transparency
        
        // Scale margins
        const scaledMargins = {
            top: this.margins.top * scale,
            bottom: this.margins.bottom * scale,
            left: this.margins.left * scale,
            right: this.margins.right * scale
        };
        
        // Top margin
        this.ctx.fillRect(
            offsetX,
            offsetY,
            scaledWidth,
            scaledMargins.top
        );
        
        // Bottom margin
        this.ctx.fillRect(
            offsetX,
            offsetY + scaledHeight - scaledMargins.bottom,
            scaledWidth,
            scaledMargins.bottom
        );
        
        // Left margin
        this.ctx.fillRect(
            offsetX,
            offsetY,
            scaledMargins.left,
            scaledHeight
        );
        
        // Right margin
        this.ctx.fillRect(
            offsetX + scaledWidth - scaledMargins.right,
            offsetY,
            scaledMargins.right,
            scaledHeight
        );
        
        // Draw margin borders
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 2]);
        
        // Top margin line
        this.ctx.beginPath();
        this.ctx.moveTo(offsetX, offsetY + scaledMargins.top);
        this.ctx.lineTo(offsetX + scaledWidth, offsetY + scaledMargins.top);
        this.ctx.stroke();
        
        // Bottom margin line
        this.ctx.beginPath();
        this.ctx.moveTo(offsetX, offsetY + scaledHeight - scaledMargins.bottom);
        this.ctx.lineTo(offsetX + scaledWidth, offsetY + scaledHeight - scaledMargins.bottom);
        this.ctx.stroke();
        
        // Left margin line
        this.ctx.beginPath();
        this.ctx.moveTo(offsetX + scaledMargins.left, offsetY);
        this.ctx.lineTo(offsetX + scaledMargins.left, offsetY + scaledHeight);
        this.ctx.stroke();
        
        // Right margin line
        this.ctx.beginPath();
        this.ctx.moveTo(offsetX + scaledWidth - scaledMargins.right, offsetY);
        this.ctx.lineTo(offsetX + scaledWidth - scaledMargins.right, offsetY + scaledHeight);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }
    
    private updateInfo(): void {
        const paper = this.paperSizes[this.currentSize];
        let width: number, height: number;
        
        if (this.currentOrientation === 'portrait') {
            width = paper.width;
            height = paper.height;
        } else {
            width = paper.height;
            height = paper.width;
        }
        
        // Update dimensions display
        if (this.dimensionsEl) {
            this.dimensionsEl.textContent = `${width} × ${height} mm (${paper.name} ${this.currentOrientation.charAt(0).toUpperCase() + this.currentOrientation.slice(1)})`;
        }
        
        // Update margins display
        const { top, bottom, left, right } = this.margins;
        if (this.marginsInfoEl) {
            if (top === bottom && left === right && top === left) {
                this.marginsInfoEl.textContent = `Margins: ${top}mm all sides`;
            } else {
                this.marginsInfoEl.textContent = `Margins: ${top}mm top, ${right}mm right, ${bottom}mm bottom, ${left}mm left`;
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('page-preview-canvas')) {
        new PageSetupPreview();
    }
});
