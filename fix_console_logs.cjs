#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all TypeScript files
function findTSFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.includes('node_modules')) {
      files.push(...findTSFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.ts') && !item.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix orphaned console.log syntax in a file
function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let modified = false;
  let newLines = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Look for orphaned object literals that start with properties like:
    // "      global: { x: ..." or "      local: { x: ..." etc.
    if (/^\s+(global|local|tool|type|parentChildren|activeToolName):\s*\{?/.test(line)) {
      // This looks like an orphaned console.log parameter
      // Skip forward to find the closing }); 
      let j = i;
      let braceCount = 0;
      let foundStart = false;
      
      while (j < lines.length) {
        const currentLine = lines[j];
        
        // Count braces to find the end
        for (const char of currentLine) {
          if (char === '{') {
            braceCount++;
            foundStart = true;
          } else if (char === '}') {
            braceCount--;
          }
        }
        
        // If we found the closing pattern like });
        if (foundStart && braceCount <= 0 && /^\s*\}\);?\s*$/.test(currentLine)) {
          // Skip all lines from i to j inclusive
          i = j + 1;
          modified = true;
          break;
        }
        j++;
      }
      
      if (j >= lines.length) {
        // Didn't find proper closure, just skip this line
        i++;
      }
    } 
    // Look for orphaned closing patterns
    else if (/^\s*\}\);?\s*$/.test(line) && i > 0) {
      // Check if previous line looks like it might be an orphaned parameter
      const prevLine = lines[i-1];
      if (/^\s+(tool|type|parentChildren):\s*/.test(prevLine)) {
        // Skip this closing brace too
        modified = true;
        i++;
      } else {
        newLines.push(line);
        i++;
      }
    }
    // Look for isolated expressions that look like console.log parameters
    else if (/^\s*\);\s*$/.test(line)) {
      // This might be an orphaned closing parenthesis
      modified = true;
      i++;
    }
    else {
      newLines.push(line);
      i++;
    }
  }
  
  if (modified) {
    const newContent = newLines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

// Main execution
const srcDir = path.join(__dirname, 'src/scripts');
const tsFiles = findTSFiles(srcDir);

console.log(`Found ${tsFiles.length} TypeScript files`);

// Skip ToolColorManager.ts as it still has console.logs we want to keep
const filesToFix = tsFiles.filter(f => !f.includes('ToolColorManager.ts'));

console.log(`Fixing ${filesToFix.length} files...`);

for (const file of filesToFix) {
  try {
    fixFile(file);
  } catch (err) {
    console.error(`Error fixing ${file}: ${err.message}`);
  }
}

console.log('Done!');
