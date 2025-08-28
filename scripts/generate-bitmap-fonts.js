#!/usr/bin/env node

/**
 * Generate Bitmap Fonts for Course Builder
 * Creates .fnt and .png files for different font sizes using Node.js Canvas
 */

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module directory setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Font configuration
const FONT_CONFIG = {
    fontFamily: 'Inter, Arial, sans-serif',
    sizes: [12, 14, 16, 18, 24, 32, 48, 64],
    outputDir: './src/assets/fonts',
    charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?-_:;()[]{}"\'/\\@#$%^&*+=<>|~`'
};

function generateFont(fontSize) {
    const fontName = `coursebuilder-text-${fontSize}`;
    console.log(`⏳ Generating ${fontSize}px font...`);

    // Create canvas with enough space for all characters
    const chars = Array.from(FONT_CONFIG.charset);
    const padding = 4;
    const cellSize = fontSize + padding * 2;
    const cols = Math.ceil(Math.sqrt(chars.length));
    const rows = Math.ceil(chars.length / cols);
    
    const canvasWidth = cols * cellSize;
    const canvasHeight = rows * cellSize;
    
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    // Set up font
    ctx.font = `${fontSize}px ${FONT_CONFIG.fontFamily}`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Character metrics for .fnt file
    const charData = [];
    
    chars.forEach((char, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const x = col * cellSize + padding;
        const y = row * cellSize + padding;
        
        // Draw character
        ctx.fillText(char, x + cellSize / 2, y + cellSize / 2);
        
        // Measure character
        const metrics = ctx.measureText(char);
        const width = Math.ceil(metrics.width);
        const height = fontSize;
        
        charData.push({
            id: char.charCodeAt(0),
            char: char,
            x: x,
            y: y,
            width: width,
            height: height,
            xoffset: 0,
            yoffset: 0,
            xadvance: width
        });
    });
    
    // Generate .fnt file content
    const fntContent = `info face="${fontName}" size=${fontSize} bold=0 italic=0 charset="" unicode=0 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=0,0
common lineHeight=${fontSize} base=${fontSize} scaleW=${canvasWidth} scaleH=${canvasHeight} pages=1 packed=0
page id=0 file="${fontName}.png"
chars count=${chars.length}
${charData.map(char => `char id=${char.id} x=${char.x} y=${char.y} width=${char.width} height=${char.height} xoffset=${char.xoffset} yoffset=${char.yoffset} xadvance=${char.xadvance} page=0 chnl=0`).join('\n')}
`;

    // Ensure output directory exists
    if (!fs.existsSync(FONT_CONFIG.outputDir)) {
        fs.mkdirSync(FONT_CONFIG.outputDir, { recursive: true });
    }
    
    // Write files
    const fntPath = path.join(FONT_CONFIG.outputDir, `${fontName}.fnt`);
    const pngPath = path.join(FONT_CONFIG.outputDir, `${fontName}.png`);
    
    fs.writeFileSync(fntPath, fntContent);
    
    // Save PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(pngPath, buffer);
    
    console.log(`✅ Generated bitmap font: ${fontName} (${fontSize}px)`);
    console.log(`   📄 Font file: ${fntPath}`);
    console.log(`   🖼️  Texture file: ${pngPath}`);
    
    return { fontSize, fnt: fntPath, png: pngPath, name: fontName };
}

async function generateAllFonts() {
    console.log('🚀 Starting bitmap font generation...');
    console.log(`📝 Font family: ${FONT_CONFIG.fontFamily}`);
    console.log(`📏 Sizes: ${FONT_CONFIG.sizes.join(', ')}px`);
    console.log(`📂 Output directory: ${FONT_CONFIG.outputDir}`);
    console.log(`🔤 Character set: ${FONT_CONFIG.charset.length} characters`);
    console.log('');

    const results = [];

    for (const fontSize of FONT_CONFIG.sizes) {
        try {
            const result = generateFont(fontSize);
            results.push(result);
        } catch (error) {
            console.error(`❌ Failed to generate ${fontSize}px font:`, error);
        }
    }

    console.log('');
    console.log('📊 Generation Summary:');
    console.log(`✅ Successfully generated: ${results.length}/${FONT_CONFIG.sizes.length} fonts`);
    
    if (results.length > 0) {
        console.log('');
        console.log('📋 Generated files:');
        results.forEach(({ fontSize, fnt, png }) => {
            console.log(`   ${fontSize}px: ${path.basename(fnt)}, ${path.basename(png)}`);
        });

        // Generate font manifest for easy loading
        const manifest = {
            fonts: results.map(({ fontSize, fnt, png, name }) => ({
                name: name,
                size: fontSize,
                fnt: `fonts/${path.basename(fnt)}`,
                png: `fonts/${path.basename(png)}`
            }))
        };

        const manifestPath = path.join(FONT_CONFIG.outputDir, 'font-manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`📋 Font manifest created: ${manifestPath}`);
    }

    console.log('');
    console.log('🎉 Bitmap font generation complete!');
}

// Run the generator
generateAllFonts().catch(error => {
    console.error('💥 Font generation failed:', error);
    process.exit(1);
});
