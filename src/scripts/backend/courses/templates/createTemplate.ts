import { TemplateManager } from "./TemplateManager";
import { TemplateDataHandler } from "./TemplateDataHandler";
import { TemplateRenderer } from "./TemplateRenderer";
import { TemplateConfigManager } from "./TemplateConfigManager";
import { TemplateBlockRenderer } from "./TemplateBlockRenderer";
import { ensureTemplateModals } from "./templateModals";
import type { TemplateData, TemplateBlock, TemplateBlockType, TemplateType, BlockFieldConfig, FieldRow } from "./types";

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
    const baseClass = 'text-sm font-medium';
    const statusClass = isError ? 'text-red-600' : 'text-green-600';
    statusElement.className = `${baseClass} ${statusClass}`;
    statusElement.setAttribute('data-template-status', isError ? 'error' : 'success');
  }
}

// Initialize template system
let templateInterfaceInitialized = false;
let retryCount = 0;
const MAX_RETRIES = 50; // Max 5 seconds (50 * 100ms)

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
    retryCount++;
    if (retryCount >= MAX_RETRIES) {
      console.error('❌ Template buttons not found after maximum retries. Buttons may not exist in the current view.');
      return;
    }
    console.warn(`⚠️ Template buttons not found yet, retrying in 100ms... (${retryCount}/${MAX_RETRIES})`);
    setTimeout(() => {
      initializeTemplateInterface();
    }, 100);
    return;
  }
  
  console.log('✅ Template buttons found in DOM');
  retryCount = 0; // Reset retry count on success
  
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

const initializeTemplateModule = () => {
  console.log('📋 Template module loaded, setting up observers...');

  // Check if we're on the templates section immediately
  const templatesSection = document.getElementById('templates');
  const generationSection = document.getElementById('generation');

  // Initialize immediately if templates section is active
  if (templatesSection && !templatesSection.classList.contains('hidden')) {
    console.log('✅ Templates section already active, initializing now');
    setTimeout(() => initializeTemplateInterface(), 50); // Small delay to ensure buttons are rendered
  }

  // Watch for when either section becomes active
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target as HTMLElement;
        const isTemplatesOrGeneration = target.id === 'templates' || target.id === 'generation';

        if (isTemplatesOrGeneration && !target.classList.contains('hidden')) {
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
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTemplateModule);
} else {
  initializeTemplateModule();
}

// Make TemplateManager available globally for backward compatibility
(window as any).TemplateManager = TemplateManager;