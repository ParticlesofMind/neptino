import { TemplateManager } from "./TemplateManager.js";
import { TemplateDataHandler } from "./TemplateDataHandler.js";
import { TemplateRenderer } from "./TemplateRenderer.js";
import { TemplateConfigManager } from "./TemplateConfigManager.js";
import { TemplateBlockRenderer } from "./TemplateBlockRenderer.js";
import { ensureTemplateModals } from "./templateModals.js";
import type { TemplateData, TemplateBlock, TemplateBlockType, TemplateType, BlockFieldConfig, FieldRow } from "./types.js";

// Re-export all types and classes for backward compatibility
export type {
  TemplateData,
  TemplateBlock,
  TemplateBlockType,
  TemplateType,
  BlockFieldConfig,
  FieldRow,
};

export {
  TemplateManager,
  TemplateDataHandler,
  TemplateRenderer,
  TemplateConfigManager,
  TemplateBlockRenderer,
};

// Utility functions
export function formatTemplateSavedMessage(): string {
  return "Template saved successfully!";
}

export function setTemplateStatus(message: string, isError = false): void {
  const statusElement = document.getElementById('template-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = isError ? 'template-status template-status--error' : 'template-status template-status--success';
  }
}

// Initialize template system
let templateInterfaceInitialized = false;

function initializeTemplateInterface() {
  if (templateInterfaceInitialized) {
    console.log('⏭️ Template interface already initialized, skipping');
    return;
  }
  
  console.log('🔧 Initializing template interface...');
  
  // Check if buttons exist before initializing
  const createBtn = document.getElementById('create-template-btn');
  const loadBtn = document.getElementById('load-template-btn');
  
  if (!createBtn || !loadBtn) {
    console.warn('⚠️ Template buttons not found yet, retrying in 100ms...');
    setTimeout(() => {
      templateInterfaceInitialized = false; // Reset flag to allow retry
      initializeTemplateInterface();
    }, 100);
    return;
  }
  
  console.log('✅ Template buttons found in DOM');
  
  // Ensure template modals are available
  try {
    ensureTemplateModals();
    console.log('✅ Template modals ensured');
  } catch (error) {
    console.warn('⚠️ Template modals not available:', error);
  }
  
  // Initialize basic interface
  TemplateManager.initializeBasicInterface();
  templateInterfaceInitialized = true;
  console.log('✅ Template interface fully initialized');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('📋 Template module loaded, setting up observers...');
  
  // Check if we're on the templates section immediately
  const templatesSection = document.getElementById('templates');
  const generationSection = document.getElementById('generation');
  
  // Initialize immediately if templates section is active
  if (templatesSection && templatesSection.classList.contains('is-active')) {
    console.log('✅ Templates section already active, initializing now');
    setTimeout(() => initializeTemplateInterface(), 50); // Small delay to ensure buttons are rendered
  }
  
  // Watch for when either section becomes active
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target as HTMLElement;
        const isTemplatesOrGeneration = target.id === 'templates' || target.id === 'generation';
        
        if (isTemplatesOrGeneration && target.classList.contains('is-active')) {
          console.log(`🔔 ${target.id} section became active, initializing template interface`);
          setTimeout(() => initializeTemplateInterface(), 50); // Small delay to ensure buttons are rendered
        }
      }
    });
  });
  
  // Observe both sections
  if (templatesSection) {
    observer.observe(templatesSection, {
      attributes: true,
      attributeFilter: ['class'],
    });
    console.log('👁️ Observing templates section for activation');
  }
  
  if (generationSection) {
    observer.observe(generationSection, {
      attributes: true,
      attributeFilter: ['class'],
    });
    console.log('👁️ Observing generation section for activation');
  }
  
  if (!templatesSection && !generationSection) {
    console.warn('⚠️ Templates and generation sections not found in DOM');
  }
});

// Make TemplateManager available globally for backward compatibility
(window as any).TemplateManager = TemplateManager;