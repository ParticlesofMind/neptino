import { copyFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy manifest.json
copyFileSync(
  join(rootDir, 'manifest.json'),
  join(distDir, 'manifest.json')
);

// Copy popup.html
copyFileSync(
  join(rootDir, 'popup.html'),
  join(distDir, 'popup.html')
);

// Create icons directory if it doesn't exist
const iconsDir = join(distDir, 'icons');
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Create a simple README for icons
const iconReadme = `# Icons Required

Please add the following PNG icon files to this directory:

- icon16.png (16x16 pixels)
- icon48.png (48x48 pixels)
- icon128.png (128x128 pixels)

You can create these using any image editor. A simple CSS selector icon would be appropriate.
For testing, you can use simple colored squares as placeholders.
`;

if (!existsSync(join(iconsDir, 'icon16.png'))) {
  console.log('⚠️  Icons not found. Generating placeholder icons...');
  try {
    // Try to generate placeholder icons
    execSync('node scripts/create-placeholder-icons.js', { cwd: rootDir, stdio: 'inherit' });
    console.log('✓ Placeholder icons generated');
  } catch (error) {
    writeFileSync(join(iconsDir, 'README.txt'), iconReadme);
    console.log('⚠️  Could not auto-generate icons. Please run: node scripts/create-placeholder-icons.js');
    console.log('   Or open dist/generate-icons.html in your browser to create custom icons');
  }
} else {
  console.log('✓ Assets copied successfully');
}

