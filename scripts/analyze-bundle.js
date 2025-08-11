#!/usr/bin/env node

/**
 * Bundle Size Analyzer
 * Provides insights into bundle composition and suggests optimizations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist/assets');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  console.log('📊 Bundle Size Analysis');
  console.log('='.repeat(50));

  if (!fs.existsSync(distDir)) {
    console.log('❌ No dist directory found. Run "npm run build" first.');
    return;
  }

  const files = fs.readdirSync(distDir);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  const cssFiles = files.filter(file => file.endsWith('.css'));
  const assetFiles = files.filter(file => !file.endsWith('.js') && !file.endsWith('.css') && !file.endsWith('.map'));

  let totalSize = 0;
  let jsSize = 0;
  let cssSize = 0;
  let assetSize = 0;

  console.log('📁 JavaScript Files:');
  jsFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    const size = fs.statSync(filePath).size;
    jsSize += size;
    totalSize += size;
    console.log(`  ${file}: ${formatBytes(size)}`);
  });

  console.log('\n🎨 CSS Files:');
  cssFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    const size = fs.statSync(filePath).size;
    cssSize += size;
    totalSize += size;
    console.log(`  ${file}: ${formatBytes(size)}`);
  });

  console.log('\n🖼️  Asset Files:');
  assetFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    const size = fs.statSync(filePath).size;
    assetSize += size;
    totalSize += size;
    console.log(`  ${file}: ${formatBytes(size)}`);
  });

  console.log('\n📈 Summary:');
  console.log(`  JavaScript: ${formatBytes(jsSize)} (${((jsSize/totalSize)*100).toFixed(1)}%)`);
  console.log(`  CSS: ${formatBytes(cssSize)} (${((cssSize/totalSize)*100).toFixed(1)}%)`);
  console.log(`  Assets: ${formatBytes(assetSize)} (${((assetSize/totalSize)*100).toFixed(1)}%)`);
  console.log(`  Total: ${formatBytes(totalSize)}`);

  // Recommendations
  console.log('\n💡 Recommendations:');
  
  if (jsSize > 500 * 1024) {
    console.log('  - Consider more aggressive code splitting for JS files > 500KB');
  }
  
  if (assetSize > 1000 * 1024) {
    console.log('  - Consider optimizing large asset files (images, fonts)');
  }
  
  const largeJsFiles = jsFiles.filter(file => {
    const size = fs.statSync(path.join(distDir, file)).size;
    return size > 300 * 1024;
  });
  
  if (largeJsFiles.length > 0) {
    console.log(`  - Large JS files detected: ${largeJsFiles.join(', ')}`);
    console.log('    Consider lazy loading or further chunking');
  }
  
  console.log('  - Use "npm run build -- --analyze" for detailed bundle analysis');
}

analyzeBundle();
