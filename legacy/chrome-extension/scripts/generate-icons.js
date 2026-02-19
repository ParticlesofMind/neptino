import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const iconsDir = join(distDir, 'icons');

// Ensure directories exist
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Create a simple HTML file that generates icons using canvas
// This is the most reliable cross-platform approach
const iconGeneratorHTML = `<!DOCTYPE html>
<html>
<head>
  <title>CSS Selector Inspector - Icon Generator</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; }
    .instructions {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .icon-container {
      display: inline-block;
      margin: 15px;
      text-align: center;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    canvas {
      border: 1px solid #ddd;
      display: block;
      margin: 0 auto 10px;
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: #2563eb;
    }
    .download-all {
      background: #10b981;
      padding: 12px 24px;
      font-size: 16px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>CSS Selector Inspector - Icon Generator</h1>
  <div class="instructions">
    <p><strong>Instructions:</strong></p>
    <ol>
      <li>Click "Download" under each icon to save it</li>
      <li>Or click "Download All" to download all three icons at once</li>
      <li>Save the files as <code>icon16.png</code>, <code>icon48.png</code>, and <code>icon128.png</code></li>
      <li>Place them in the <code>chrome-extension/dist/icons/</code> directory</li>
    </ol>
  </div>
  
  <div id="icons"></div>
  
  <div style="text-align: center; margin-top: 30px;">
    <button class="download-all" onclick="downloadAll()">Download All Icons</button>
  </div>

  <script>
    const sizes = [16, 48, 128];
    const container = document.getElementById('icons');
    const canvases = {};
    
    sizes.forEach(size => {
      const div = document.createElement('div');
      div.className = 'icon-container';
      
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      // Draw background (blue gradient)
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#2563eb');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      // Draw a simple CSS selector icon (curly braces)
      ctx.strokeStyle = 'white';
      ctx.lineWidth = Math.max(1, size / 16);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size * 0.25;
      
      // Draw left brace {
      ctx.beginPath();
      ctx.moveTo(centerX - radius * 0.3, centerY - radius);
      ctx.quadraticCurveTo(centerX - radius * 0.8, centerY - radius * 0.5, centerX - radius * 0.8, centerY);
      ctx.quadraticCurveTo(centerX - radius * 0.8, centerY + radius * 0.5, centerX - radius * 0.3, centerY + radius);
      ctx.stroke();
      
      // Draw right brace }
      ctx.beginPath();
      ctx.moveTo(centerX + radius * 0.3, centerY - radius);
      ctx.quadraticCurveTo(centerX + radius * 0.8, centerY - radius * 0.5, centerX + radius * 0.8, centerY);
      ctx.quadraticCurveTo(centerX + radius * 0.8, centerY + radius * 0.5, centerX + radius * 0.3, centerY + radius);
      ctx.stroke();
      
      // Add a small dot in the center (representing selector)
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      
      canvases[size] = canvas;
      
      const label = document.createElement('div');
      label.textContent = \`icon\${size}.png (\${size}×\${size})\`;
      label.style.marginBottom = '10px';
      label.style.fontWeight = '500';
      
      const button = document.createElement('button');
      button.textContent = 'Download';
      button.onclick = () => downloadIcon(size);
      
      div.appendChild(canvas);
      div.appendChild(label);
      div.appendChild(button);
      container.appendChild(div);
    });
    
    function downloadIcon(size) {
      const canvas = canvases[size];
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`icon\${size}.png\`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
    
    function downloadAll() {
      sizes.forEach((size, index) => {
        setTimeout(() => downloadIcon(size), index * 200);
      });
    }
  </script>
</body>
</html>`;

// Write the HTML file
const htmlPath = join(distDir, 'generate-icons.html');
writeFileSync(htmlPath, iconGeneratorHTML);

console.log('✓ Created icon generator at:', htmlPath);
console.log('\nTo generate icons:');
console.log('1. Open generate-icons.html in your browser');
console.log('2. Click "Download" for each icon (or "Download All")');
console.log('3. Save the files to chrome-extension/dist/icons/');
console.log('\nAlternatively, you can create simple colored square PNGs manually.');


