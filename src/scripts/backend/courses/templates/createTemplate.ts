import { TemplateManager } from "./TemplateManager.js";
import { TemplateDataHandler } from "./TemplateDataHandler.js";
import { TemplateRenderer } from "./TemplateRenderer.js";
import { TemplateConfigManager } from "./TemplateConfigManager.js";
import { TemplateBlockRenderer } from "./TemplateBlockRenderer.js";
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

// Initialize template system when module loads
document.addEventListener('DOMContentLoaded', () => {
  // Ensure template modals are available
  try {
    const { ensureTemplateModals } = require("./templateModals.js");
    if (typeof ensureTemplateModals === 'function') {
      ensureTemplateModals();
    }
  } catch (error) {
    console.warn('Template modals not available:', error);
  }
  
  // Initialize basic interface if template container exists
  const templateContainer = document.querySelector('.template');
  if (templateContainer) {
    TemplateManager.initializeBasicInterface();
  }
});

// Make TemplateManager available globally for backward compatibility
(window as any).TemplateManager = TemplateManager;