/**
 * PixiJS DevTools Setup
 * Initializes PixiJS development tools for debugging and inspection
 */

import { initDevtools } from '@pixi/devtools';
import { PixiSceneInspector } from './devtools/PixiSceneInspector';

// Development environment check
const isDevelopment = import.meta.env.DEV;

console.log('🔧 DevTools setup - Development mode:', isDevelopment);

if (isDevelopment) {
 // Initialize official PixiJS DevTools
 try {
 console.log('🔧 Initializing PixiJS DevTools...');
 initDevtools({
 app: undefined // Will be set when app is ready
 });
 console.log('✅ PixiJS DevTools initialized successfully');
 } catch (error) {
 console.warn('⚠️ Failed to initialize PixiJS DevTools:', error);
 }

 // Initialize custom scene inspector
 console.log('🔧 Setting up custom scene inspector...');
 const sceneInspector = new PixiSceneInspector();
 
 // Make inspector globally available for console access
 (window as any).sceneInspector = sceneInspector;
 
 // Listen for PixiJS app ready event
 window.addEventListener('pixi-app-ready', (event: Event) => {
 console.log('🎯 PixiJS app detected, connecting devtools...');
 const customEvent = event as CustomEvent;
 const app = customEvent.detail;
 
 // Connect official devtools
 try {
 if ((window as any).__PIXI_DEVTOOLS__) {
 (window as any).__PIXI_DEVTOOLS__.app = app;
 console.log('✅ PixiJS DevTools connected to app');
 }
 } catch (error) {
 console.warn('⚠️ Failed to connect PixiJS DevTools to app:', error);
 }
 
 // Connect custom scene inspector
 sceneInspector.setApp(app);
 console.log('✅ Scene inspector connected to app');
 
 // Provide console commands
 console.log('🎮 DevTools commands available:');
 console.log(' sceneInspector.inspectScene() - One-time scene inspection');
 console.log(' sceneInspector.startInspection() - Continuous monitoring');
 console.log(' sceneInspector.stopInspection() - Stop monitoring');
 console.log(' sceneInspector.findObjects("name") - Find objects by name');
 console.log(' sceneInspector.countByType() - Count objects by type');
 console.log(' sceneInspector.exportSceneStructure() - Export scene as JSON');
 });
 
 // Listen for any PixiJS errors
 window.addEventListener('error', (event) => {
 if (event.message && event.message.includes('pixi')) {
 console.error('🚨 PixiJS Error detected:', event.error);
 }
 });
 
 console.log('✅ DevTools setup completed');
} else {
 console.log('📦 Production mode - DevTools disabled');
}

// Export for potential programmatic access
export { PixiSceneInspector };
