/**
 * Rocket.Chat Helper Functions for Playwright Tests
 */

import { Page, expect } from '@playwright/test';

export class RocketChatHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to Messages section
   */
  async goToMessages(): Promise<void> {
    await this.page.click('a[data-section="messages"]');
    await this.page.waitForSelector('#rocketchat-container');
  }

  /**
   * Verify Rocket.Chat container is present
   */
  async verifyRocketChatContainer(): Promise<void> {
    await expect(this.page.locator('#rocketchat-container')).toBeVisible();
  }

  /**
   * Verify Rocket.Chat iframe is loaded
   */
  async verifyRocketChatIframe(): Promise<void> {
    const iframe = this.page.locator('#rocketchat-iframe');
    await expect(iframe).toBeVisible();
    
    // Check if iframe has a src attribute
    await expect(iframe).toHaveAttribute('src');
  }

  /**
   * Search for a user by email
   */
  async searchUser(email: string): Promise<void> {
    const searchInput = this.page.locator('#user-search-input');
    await searchInput.fill(email);
    await this.page.click('#search-user-btn');
    
    // Wait for search results
    await this.page.waitForSelector('#search-results', { state: 'visible' });
  }

  /**
   * Verify user search results are displayed
   */
  async verifySearchResults(): Promise<void> {
    await expect(this.page.locator('#search-results')).toBeVisible();
    await expect(this.page.locator('#search-results-list')).toBeVisible();
  }

  /**
   * Start a conversation with a user
   */
  async startConversation(email: string): Promise<void> {
    // First search for the user
    await this.searchUser(email);
    
    // Click the "Start Conversation" button for the user
    await this.page.click(`button[data-email="${email}"]`);
    
    // Wait for iframe to update
    await this.page.waitForTimeout(2000);
  }

  /**
   * Verify messaging interface is loaded
   */
  async verifyMessagingInterface(): Promise<void> {
    await expect(this.page.locator('.messaging-interface')).toBeVisible();
    await expect(this.page.locator('.messaging-header')).toBeVisible();
    await expect(this.page.locator('#user-search-input')).toBeVisible();
    await expect(this.page.locator('#search-user-btn')).toBeVisible();
  }

  /**
   * Check if Rocket.Chat service is available
   */
  async isRocketChatAvailable(): Promise<boolean> {
    try {
      // Try to access Rocket.Chat API
      const response = await this.page.request.get('http://localhost:3001/api/v1/info');
      return response.ok();
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for Rocket.Chat iframe to load
   */
  async waitForRocketChatLoad(): Promise<void> {
    // Wait for iframe to be present
    await this.page.waitForSelector('#rocketchat-iframe');
    
    // Wait for iframe to have content
    await this.page.waitForFunction(() => {
      const iframe = document.querySelector('#rocketchat-iframe') as HTMLIFrameElement;
      return iframe && iframe.src && iframe.src.length > 0;
    });
  }

  /**
   * Verify error message is displayed
   */
  async verifyErrorMessage(): Promise<void> {
    await expect(this.page.locator('.messaging-error')).toBeVisible();
  }

  /**
   * Get iframe source URL
   */
  async getIframeSrc(): Promise<string | null> {
    const iframe = this.page.locator('#rocketchat-iframe');
    return await iframe.getAttribute('src');
  }

  /**
   * Verify iframe URL contains authentication parameters
   */
  async verifyIframeAuth(): Promise<void> {
    const src = await this.getIframeSrc();
    expect(src).toBeTruthy();
    expect(src).toContain('token=');
    expect(src).toContain('userId=');
  }
}