/**
 * TextArea Manager - Handles HTML textarea creation and management
 * Provides modern styling, drag-to-create, copy/paste functionality
 */

import { Rectangle, Point } from "pixi.js";
import { TextSettings } from "./TextTypes";
import { TextBitmapFontManager } from "./TextBitmapFontManager";

export class TextAreaManager {
    private activeTextAreas = new Map<string, HTMLTextAreaElement>();
    private textAreaIdCounter = 0;

    constructor(_fontManager: TextBitmapFontManager) {
        // Font manager not used currently, but kept for future extensibility
    }

    /**
     * Create a new text area with modern styling
     */
    createTextArea(
        bounds: Rectangle, 
        _settings: TextSettings, // Unused but kept for interface consistency
        onComplete: (text: string, position: Point) => void
    ): string {
        const textAreaId = `textarea-${++this.textAreaIdCounter}`;
        
        // Create textarea element
        const textarea = document.createElement("textarea");
        textarea.id = textAreaId;
        
        // Apply modern styling classes
        textarea.className = "input input--text";
        
        // Set properties for functionality
        textarea.placeholder = "Type your text here...";
        textarea.spellcheck = true;
        
        // Position and size the textarea
        this.positionTextArea(textarea, bounds);
        
        // Add to DOM
        document.body.appendChild(textarea);
        
        // Store reference
        this.activeTextAreas.set(textAreaId, textarea);
        
        // Set up event handlers
        this.setupTextAreaEvents(textarea, textAreaId, bounds, onComplete);
        
        // Focus and select
        setTimeout(() => {
            textarea.focus();
            textarea.select();
        }, 10);
        
        console.log(`📝 TEXTAREA: Created ${textAreaId} at ${bounds.x}, ${bounds.y}`);
        return textAreaId;
    }

    /**
     * Position and size the textarea element
     */
    private positionTextArea(textarea: HTMLTextAreaElement, bounds: Rectangle): void {
        // Get canvas position for absolute positioning
        const canvas = document.querySelector("#canvas-container canvas") as HTMLCanvasElement;
        let adjustedX = bounds.x;
        let adjustedY = bounds.y;
        
        if (canvas) {
            const canvasRect = canvas.getBoundingClientRect();
            adjustedX = canvasRect.left + bounds.x;
            adjustedY = canvasRect.top + bounds.y;
        }
        
        // Apply positioning and sizing
        textarea.style.left = `${adjustedX}px`;
        textarea.style.top = `${adjustedY}px`;
        textarea.style.width = `${Math.max(bounds.width, 200)}px`;
        textarea.style.height = `${Math.max(bounds.height, 60)}px`;
        textarea.style.position = 'absolute';
        textarea.style.zIndex = '1000';
        
        // Modern styling via CSS custom properties
        textarea.style.resize = 'both';
        textarea.style.minWidth = '150px';
        textarea.style.minHeight = '40px';
    }

    /**
     * Set up event handlers for the textarea
     */
    private setupTextAreaEvents(
        textarea: HTMLTextAreaElement,
        textAreaId: string,
        bounds: Rectangle,
        onComplete: (text: string, position: Point) => void
    ): void {
        let isJustCreated = true;
        
        // Clear the "just created" flag after a short delay
        setTimeout(() => {
            isJustCreated = false;
        }, 500);
        
        // Keyboard shortcuts
        textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                // Ctrl+Enter or Cmd+Enter to finalize
                e.preventDefault();
                this.finalizeTextArea(textAreaId, bounds, onComplete);
            } else if (e.key === "Escape") {
                // Escape to cancel
                e.preventDefault();
                this.removeTextArea(textAreaId);
            }
            // Allow normal Enter for line breaks
        });
        
        // Handle blur (when user clicks outside)
        textarea.addEventListener("blur", () => {
            if (isJustCreated) {
                console.log('📝 TEXTAREA: Ignoring blur - just created');
                return;
            }
            
            // Delay to check if focus went to another element
            setTimeout(() => {
                if (document.activeElement !== textarea && this.activeTextAreas.has(textAreaId)) {
                    console.log('📝 TEXTAREA: Finalizing due to blur');
                    this.finalizeTextArea(textAreaId, bounds, onComplete);
                }
            }, 200);
        });
        
        // Prevent canvas from handling clicks on textarea
        textarea.addEventListener("mousedown", (e) => {
            e.stopPropagation();
        });
        
        textarea.addEventListener("click", (e) => {
            e.stopPropagation();
        });
        
        // Handle paste events (copy/paste functionality)
        textarea.addEventListener("paste", (_e) => {
            console.log('📝 TEXTAREA: Paste event handled');
            // Browser handles paste automatically, but we can add custom logic here if needed
        });
        
        // Auto-resize height based on content (optional enhancement)
        textarea.addEventListener("input", () => {
            this.autoResizeHeight(textarea);
        });
    }

    /**
     * Auto-resize textarea height based on content
     */
    private autoResizeHeight(textarea: HTMLTextAreaElement): void {
        // Reset height to calculate scroll height
        textarea.style.height = 'auto';
        
        // Set height based on scroll height, with reasonable limits
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 400);
        textarea.style.height = `${newHeight}px`;
    }

    /**
     * Finalize the textarea and create bitmap text
     */
    private finalizeTextArea(
        textAreaId: string,
        bounds: Rectangle,
        onComplete: (text: string, position: Point) => void
    ): void {
        const textarea = this.activeTextAreas.get(textAreaId);
        if (!textarea) return;
        
        const text = textarea.value.trim();
        
        if (text) {
            // Call the completion callback with the text and position
            onComplete(text, new Point(bounds.x, bounds.y));
        }
        
        // Remove the textarea
        this.removeTextArea(textAreaId);
    }

    /**
     * Remove a textarea from DOM and cleanup
     */
    removeTextArea(textAreaId: string): void {
        const textarea = this.activeTextAreas.get(textAreaId);
        if (textarea && textarea.parentNode) {
            textarea.parentNode.removeChild(textarea);
        }
        
        this.activeTextAreas.delete(textAreaId);
        console.log(`📝 TEXTAREA: Removed ${textAreaId}`);
    }

    /**
     * Get active textarea by ID
     */
    getTextArea(textAreaId: string): HTMLTextAreaElement | null {
        return this.activeTextAreas.get(textAreaId) || null;
    }

    /**
     * Check if there are any active textareas
     */
    hasActiveTextAreas(): boolean {
        return this.activeTextAreas.size > 0;
    }

    /**
     * Get count of active textareas
     */
    getActiveCount(): number {
        return this.activeTextAreas.size;
    }

    /**
     * Clean up all textareas (called when tool is deactivated)
     */
    cleanup(): void {
        console.log(`📝 TEXTAREA: Cleaning up ${this.activeTextAreas.size} active textareas`);
        
        // Remove all active textareas
        Array.from(this.activeTextAreas.keys()).forEach(textAreaId => {
            this.removeTextArea(textAreaId);
        });
        
        this.activeTextAreas.clear();
    }
}
