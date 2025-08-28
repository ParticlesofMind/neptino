/**
 * Bitmap Font Manager - Handles pre-generated bitmap font loading and BitmapText instances
 */

import { BitmapText, Assets } from "pixi.js";
import { TextSettings } from "./TextTypes";

// Available font sizes from our pre-generated fonts
const AVAILABLE_FONT_SIZES = [12, 14, 16, 18, 24, 32, 48, 64];

export class TextBitmapFontManager {
    private static loadedFonts = new Set<string>();
    private static readonly BASE_FONT_NAME = "coursebuilder-text";
    private static isInitialized = false;

    constructor() {
        // Font manager is ready to use
    }

    /**
     * Initialize all bitmap fonts by loading pre-generated font files
     */
    async initializeFonts(): Promise<void> {
        if (TextBitmapFontManager.isInitialized) {
            console.log('📝 FONT: Fonts already initialized');
            return;
        }

        console.log('📝 FONT: Loading pre-generated bitmap fonts...');
        
        try {
            const loadPromises = AVAILABLE_FONT_SIZES.map(async (fontSize) => {
                return this.loadFont(fontSize);
            });

            await Promise.all(loadPromises);
            
            TextBitmapFontManager.isInitialized = true;
            console.log(`📝 FONT: Loaded ${TextBitmapFontManager.loadedFonts.size} pre-generated bitmap fonts`);
            
        } catch (error) {
            console.error('📝 FONT: Failed to initialize fonts:', error);
            throw error;
        }
    }

    /**
     * Load a single bitmap font from .fnt and .png files
     */
    private async loadFont(fontSize: number): Promise<void> {
        const fontName = this.getFontName(fontSize);
        
        if (TextBitmapFontManager.loadedFonts.has(fontName)) {
            return; // Already loaded
        }

        try {
            // Load the font using PixiJS Assets system for loading .fnt files
            const fntUrl = `/src/assets/fonts/${fontName}.fnt`;
            
            // Load the .fnt file using Assets.load
            await Assets.load(fntUrl);
            
            // Mark as loaded
            TextBitmapFontManager.loadedFonts.add(fontName);
            console.log(`📝 FONT: Loaded pre-generated font: ${fontName} (${fontSize}px)`);
            
        } catch (error) {
            console.warn(`📝 FONT: Failed to load font ${fontName}:`, error);
        }
    }

    /**
     * Create a BitmapText instance with the specified settings
     */
    createBitmapText(text: string, settings: TextSettings): BitmapText {
        const fontName = this.getFontName(settings.fontSize);
        
        // Ensure the font is loaded
        if (!TextBitmapFontManager.loadedFonts.has(fontName)) {
            console.warn(`📝 FONT: Font ${fontName} not loaded, falling back to closest available font`);
            // Find the closest available font size
            const availableSizes = this.getAvailableSizes();
            const closestSize = availableSizes.reduce((prev, curr) => 
                Math.abs(curr - settings.fontSize) < Math.abs(prev - settings.fontSize) ? curr : prev
            );
            const fallbackFontName = this.getFontName(closestSize);
            
            if (TextBitmapFontManager.loadedFonts.has(fallbackFontName)) {
                console.log(`📝 FONT: Using fallback font: ${fallbackFontName}`);
                return this.createBitmapTextWithFont(text, fallbackFontName, settings);
            } else {
                throw new Error(`No bitmap fonts available for text rendering`);
            }
        }

        return this.createBitmapTextWithFont(text, fontName, settings);
    }

    /**
     * Create BitmapText with a specific font name
     */
    private createBitmapTextWithFont(text: string, fontName: string, settings: TextSettings): BitmapText {
        // Create the bitmap text
        const bitmapText = new BitmapText({
            text: text,
            style: {
                fontFamily: fontName,
                fontSize: settings.fontSize,
            }
        });

        // Apply color via tint (more efficient for bitmap fonts)
        bitmapText.tint = settings.color;

        // Ensure crisp rendering
        bitmapText.roundPixels = true;

        return bitmapText;
    }

    /**
     * Get the font name for a specific size
     */
    private getFontName(fontSize: number): string {
        return `${TextBitmapFontManager.BASE_FONT_NAME}-${fontSize}`;
    }

    /**
     * Check if a font is available for the given size
     */
    isFontAvailable(fontSize: number): boolean {
        return TextBitmapFontManager.loadedFonts.has(this.getFontName(fontSize));
    }

    /**
     * Get all available font sizes
     */
    getAvailableSizes(): number[] {
        return AVAILABLE_FONT_SIZES;
    }

    /**
     * Wait for fonts to be initialized
     */
    async waitForInitialization(): Promise<void> {
        if (!TextBitmapFontManager.isInitialized) {
            await this.initializeFonts();
        }
    }

    /**
     * Cleanup resources (if needed)
     */
    destroy(): void {
        // BitmapFonts are global resources, so we don't destroy them
        // They'll be reused across tool instances
        console.log('📝 FONT: Font manager destroyed');
    }
}
