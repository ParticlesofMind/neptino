// ==========================================================================
// PAGE SETUP CANVAS PREVIEW - Interactive margin visualization
// ==========================================================================

import { pageSetupHandler } from '../backend/courses/pageSetupHandler';

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
        'us-letter': { width: 216, height: 279, name: 'US Letter' }
    };
    
    // Current settings - will be updated from pageSetupHandler
    private currentSize: string = 'a4';
    private currentOrientation: string = 'portrait';
    private currentUnits: 'mm' | 'cm' | 'inches' = 'cm';
    private margins: Margins = {
        top: 2.54,
        bottom: 2.54,
        left: 2.54,
        right: 2.54
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
        this.syncWithHandler();
        this.updatePreview();
    }

    private syncWithHandler(): void {
        // Get current settings from the page setup handler
        const currentSettings = pageSetupHandler.getCurrentSettings();
        this.currentSize = currentSettings.canvas_size;
        this.currentOrientation = currentSettings.orientation;
        this.margins = { ...currentSettings.margins };
        
        // Get units from the settings (not from the form to avoid mismatch)
        this.currentUnits = currentSettings.margins.unit as 'mm' | 'cm' | 'inches';
        
        console.log("🔄 Preview synced with handler:", {
            units: this.currentUnits,
            margins: this.margins,
            size: this.currentSize,
            orientation: this.currentOrientation
        });
    }
    
    private bindEvents(): void {
        // Listen for changes from form inputs (handled by pageSetupHandler)
        document.addEventListener('pageLayoutChange', (e: Event) => {
            const customEvent = e as CustomEvent;
            const settings = customEvent.detail;
            this.currentSize = settings.canvas_size;
            this.currentOrientation = settings.orientation;
            this.margins = { ...settings.margins };
            this.currentUnits = settings.margins.unit as 'mm' | 'cm' | 'inches';
            console.log("📡 Received pageLayoutChange:", { units: this.currentUnits, margins: this.margins });
            this.updatePreview();
        });

        // Also listen to direct input changes as backup
        document.querySelectorAll('input[name="canvas-size"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.currentSize = target.value;
                this.updatePreview();
            });
        });
        
        document.querySelectorAll('input[name="orientation"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.currentOrientation = target.value;
                this.updatePreview();
            });
        });

        // Listen for units changes
        document.querySelectorAll('input[name="units"]').forEach(input => {
            input.addEventListener('change', () => {
                // Sync with handler to get the correct units and converted margins
                this.syncWithHandler();
                this.updatePreview();
            });
        });
        
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
        this.resizeCanvas();
        this.clearCanvas();
        this.drawPage();
        this.updateInfo();
    }

    private resizeCanvas(): void {
        if (!this.canvas) return;
        
        const paper = this.paperSizes[this.currentSize];
        let width: number, height: number;
        
        // Apply orientation to get actual dimensions
        if (this.currentOrientation === 'portrait') {
            width = paper.width;
            height = paper.height;
        } else {
            width = paper.height;
            height = paper.width;
        }
        
        // Calculate aspect ratio for verification
        const aspectRatio = width / height;
        
        // Calculate canvas size to maintain aspect ratio
        // Use a base scale that fits well in the interface
        const baseScale = 2.2; // Increased from 1.8 to make differences more visible
        const canvasWidth = width * baseScale;
        const canvasHeight = height * baseScale;
        
        // Set canvas dimensions
        this.canvas.width = Math.round(canvasWidth);
        this.canvas.height = Math.round(canvasHeight);
        
        console.log(`📐 ${paper.name} ${this.currentOrientation}:`);
        console.log(`   Paper: ${width}×${height}mm (aspect ratio: ${aspectRatio.toFixed(3)})`);
        console.log(`   Canvas: ${this.canvas.width}×${this.canvas.height}px`);
        console.log(`   Canvas aspect ratio: ${(this.canvas.width/this.canvas.height).toFixed(3)}`);
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
        
        // Convert margins to mm for proper scaling with paper dimensions
        const marginsInMm = this.convertMarginsToMm();
        
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
        
        // Scale margins (now in mm)
        const scaledMargins = {
            top: marginsInMm.top * scale,
            bottom: marginsInMm.bottom * scale,
            left: marginsInMm.left * scale,
            right: marginsInMm.right * scale
        };
        
        // Calculate content area (inside the margins)
        const contentX = offsetX + scaledMargins.left;
        const contentY = offsetY + scaledMargins.top;
        const contentWidth = scaledWidth - scaledMargins.left - scaledMargins.right;
        const contentHeight = scaledHeight - scaledMargins.top - scaledMargins.bottom;
        
        // Draw content area border (the blue line that moves inward as margins increase)
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]); // Dashed line
        this.ctx.strokeRect(contentX, contentY, contentWidth, contentHeight);
        
        this.ctx.setLineDash([]); // Reset line dash
    }

    private convertMarginsToMm(): Margins {
        const { top, bottom, left, right } = this.margins;
        
        if (this.currentUnits === 'mm') {
            return { top, bottom, left, right };
        } else if (this.currentUnits === 'cm') {
            return {
                top: top * 10,
                bottom: bottom * 10,
                left: left * 10,
                right: right * 10
            };
        } else if (this.currentUnits === 'inches') {
            return {
                top: top * 25.4,
                bottom: bottom * 25.4,
                left: left * 25.4,
                right: right * 25.4
            };
        }
        
        return { top, bottom, left, right }; // fallback
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
        
        // Update margins display in current units
        const { top, bottom, left, right } = this.margins;
        const unitSymbol = this.currentUnits === 'inches' ? '"' : this.currentUnits;
        
        if (this.marginsInfoEl) {
            if (top === bottom && left === right && top === left) {
                this.marginsInfoEl.textContent = `Margins: ${top}${unitSymbol} all sides`;
            } else {
                this.marginsInfoEl.textContent = `Margins: ${top}${unitSymbol} top, ${right}${unitSymbol} right, ${bottom}${unitSymbol} bottom, ${left}${unitSymbol} left`;
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
