// Quick syntax test for ToolStateManager.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the TypeScript file
const toolStateManagerPath = path.join(__dirname, 'src/scripts/coursebuilder/ui/ToolStateManager.ts');
const content = fs.readFileSync(toolStateManagerPath, 'utf8');

// Check for balanced braces
const openBraces = (content.match(/{/g) || []).length;
const closeBraces = (content.match(/}/g) || []).length;

if (openBraces === closeBraces) {} else {}

// Check for balanced parentheses
const openParens = (content.match(/\(/g) || []).length;
const closeParens = (content.match(/\)/g) || []).length;

if (openParens === closeParens) {} else {}

// Check if class structure looks correct
const hasExportClass = content.includes('export class ToolStateManager');
const hasConstructor = content.includes('constructor()');
const hasInterfaces = content.includes('interface ToolSettings') && content.includes('interface IconState');

if (hasExportClass && hasConstructor && hasInterfaces) {} else {}
