/**
 * Layout Demo Handler
 * Handles the demo button click and integrates with the canvas system
 */

import { demoLauncher } from './demo';

export class LayoutDemoHandler {
  private demoButton: HTMLButtonElement | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupHandler());
    } else {
      this.setupHandler();
    }
  }

  private setupHandler(): void {
    this.demoButton = document.getElementById('demo-layout-btn') as HTMLButtonElement;

    if (this.demoButton) {
      this.demoButton.addEventListener('click', () => this.handleDemoClick());
      console.log('✅ Layout demo button handler initialized');
    } else {
      console.warn('⚠️ Demo layout button not found - handler not initialized');
    }
  }

  private async handleDemoClick(): Promise<void> {
    if (!this.demoButton) return;

    try {
      // Update button to show loading state
      const originalText = this.demoButton.innerHTML;
      this.demoButton.innerHTML = '🔄 Loading Demo...';
      this.demoButton.disabled = true;

      // Navigate to the create section where the canvas is
      const createSection = document.querySelector('[data-section="create"]') as HTMLElement;
      if (createSection) {
        createSection.click();
      } else {
        // Fallback navigation
        window.location.hash = 'create';
      }

      // Small delay to ensure canvas container is visible
      await new Promise(resolve => setTimeout(resolve, 500));

      // Launch the visual demo
      await demoLauncher.launchVisualDemo();

      // Show success message
      this.showNotification('🎨 Layout demo launched! Check the canvas area.', 'success');

      // Reset button
      this.demoButton.innerHTML = originalText;
      this.demoButton.disabled = false;

    } catch (error) {
      console.error('❌ Failed to launch layout demo:', error);
      
      // Show error message
      this.showNotification('❌ Failed to launch demo. Check console for details.', 'error');
      
      // Reset button
      this.demoButton.innerHTML = '🎨 Demo Layout';
      this.demoButton.disabled = false;
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Simple notification - could be enhanced with a proper notification system
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      background-color: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);

    // Log to console as well
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Auto-initialize when this module is loaded
export const layoutDemoHandler = new LayoutDemoHandler();
