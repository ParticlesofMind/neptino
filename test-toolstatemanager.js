// Quick syntax test for ToolStateManager.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the TypeScript file
const toolStateManagerPath = path.join(__dirname, 'src/scripts/coursebuilder/ui/ToolStateManager.ts');
const content = fs.readFileSync(toolStateManagerPath, 'utf8');

// Basic syntax checks
console.log('✅ File readable');

// Check for balanced braces
const openBraces = (content.match(/{/g) || []).length;
const closeBraces = (content.match(/}/g) || []).length;
console.log(`Braces: ${openBraces} open, ${closeBraces} close`);

if (openBraces === closeBraces) {
    console.log('✅ Braces are balanced');
} else {
    console.log('❌ Braces are NOT balanced');
}

// Check for balanced parentheses
const openParens = (content.match(/\(/g) || []).length;
const closeParens = (content.match(/\)/g) || []).length;
console.log(`Parentheses: ${openParens} open, ${closeParens} close`);

if (openParens === closeParens) {
    console.log('✅ Parentheses are balanced');
} else {
    console.log('❌ Parentheses are NOT balanced');
}

// Check if class structure looks correct
const hasExportClass = content.includes('export class ToolStateManager');
const hasConstructor = content.includes('constructor()');
const hasInterfaces = content.includes('interface ToolSettings') && content.includes('interface IconState');

console.log(`✅ Export class found: ${hasExportClass}`);
console.log(`✅ Constructor found: ${hasConstructor}`);
console.log(`✅ Interfaces found: ${hasInterfaces}`);

if (hasExportClass && hasConstructor && hasInterfaces) {
    console.log('✅ All basic structural elements are present');
    console.log('🎉 ToolStateManager.ts appears to be syntactically correct!');
} else {
    console.log('❌ Some structural elements are missing');
}
