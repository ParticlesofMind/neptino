/**
 * Page Manager Core
 * Core page data management and business logic
 * Single Responsibility: Page data structure and core operations only
 */

import { PageSettingsModal } from '../modals/PageSettingsModal';
import { PageNavigationController } from './PageNavigationController.js';

export class PageManager {
  private pages: Array<{ id: string; name: string; content: any; description?: string }> = [];
  private pageSettingsModal: PageSettingsModal;
  private navigationController: PageNavigationController;
  private onPageChangeCallback: ((page: any) => void) | null = null;
  private onPageAddCallback: ((page: any) => void) | null = null;

  constructor() {
    this.pageSettingsModal = new PageSettingsModal();
    this.navigationController = new PageNavigationController();
    
    this.initializeFirstPage();
    this.bindCoreEvents();
    this.setupNavigationCallbacks();
  }

  /**
   * Set callback for page changes
   */
  setOnPageChange(callback: (page: any) => void): void {
    this.onPageChangeCallback = callback;
  }

  /**
   * Set callback for page additions
   */
  setOnPageAdd(callback: (page: any) => void): void {
    this.onPageAddCallback = callback;
  }

  /**
   * Initialize the first page
   */
  private initializeFirstPage(): void {
    const firstPage = {
      id: this.generatePageId(),
      name: 'Page 1',
      content: null,
      description: ''
    };
    
    this.pages.push(firstPage);
    this.navigationController.setTotalPages(1);
    console.log('📄 First page initialized:', firstPage.id);
  }

  /**
   * Bind core page events
   */
  private bindCoreEvents(): void {
    // Add page button
    const addPageBtn = document.getElementById('add-page');
    if (addPageBtn) {
      addPageBtn.addEventListener('click', this.addNewPage.bind(this));
    }

    // Page settings button
    const pageSettingsBtn = document.getElementById('page-settings');
    if (pageSettingsBtn) {
      pageSettingsBtn.addEventListener('click', this.openPageSettings.bind(this));
    }
  }

  /**
   * Setup navigation controller callbacks
   */
  private setupNavigationCallbacks(): void {
    this.navigationController.setOnPageChange((pageIndex: number) => {
      const page = this.pages[pageIndex];
      if (page && this.onPageChangeCallback) {
        this.onPageChangeCallback(page);
      }
    });
  }

  /**
   * Add a new page
   */
  addNewPage(): void {
    const newPage = {
      id: this.generatePageId(),
      name: `Page ${this.pages.length + 1}`,
      content: null,
      description: ''
    };

    this.pages.push(newPage);
    this.navigationController.setTotalPages(this.pages.length);
    this.navigationController.updatePageSelector(this.pages);
    
    // Switch to new page
    this.navigationController.setCurrentPage(this.pages.length - 1);
    
    console.log('📄 New page added:', newPage.id);

    // Trigger callbacks
    if (this.onPageAddCallback) {
      this.onPageAddCallback(newPage);
    }
    if (this.onPageChangeCallback) {
      this.onPageChangeCallback(newPage);
    }
  }

  /**
   * Open page settings modal
   */
  async openPageSettings(): Promise<void> {
    const currentPage = this.getCurrentPage();
    if (!currentPage) return;
    
    try {
      console.log('⚙️ Opening page settings for:', currentPage.id);
      const updatedPage = await this.pageSettingsModal.show(currentPage);
      
      // Update page data
      Object.assign(currentPage, updatedPage);
      this.navigationController.updatePageSelector(this.pages);
      
      console.log('💾 Page settings updated:', currentPage.id);
    } catch (error) {
      console.log('❌ Page settings cancelled');
    }
  }

  /**
   * Generate unique page ID
   */
  private generatePageId(): string {
    return `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current page
   */
  getCurrentPage(): any {
    const currentIndex = this.navigationController.getCurrentPageIndex();
    return this.pages[currentIndex];
  }

  /**
   * Get current page index
   */
  getCurrentPageIndex(): number {
    return this.navigationController.getCurrentPageIndex();
  }

  /**
   * Get all pages
   */
  getAllPages(): Array<any> {
    return [...this.pages];
  }

  /**
   * Get total page count
   */
  getPageCount(): number {
    return this.pages.length;
  }

  /**
   * Remove page by index
   */
  removePage(pageIndex: number): void {
    if (pageIndex >= 0 && pageIndex < this.pages.length && this.pages.length > 1) {
      const removedPage = this.pages.splice(pageIndex, 1)[0];
      
      this.navigationController.setTotalPages(this.pages.length);
      this.navigationController.updatePageSelector(this.pages);
      
      console.log('🗑️ Page removed:', removedPage.id);
    }
  }

  /**
   * Save page content
   */
  savePageContent(content: any): void {
    const currentPage = this.getCurrentPage();
    if (currentPage) {
      currentPage.content = content;
      console.log('💾 Page content saved:', currentPage.id);
    }
  }

  /**
   * Get page by ID
   */
  getPageById(pageId: string): any {
    return this.pages.find(page => page.id === pageId);
  }

  /**
   * Update page name
   */
  updatePageName(pageIndex: number, name: string): void {
    if (pageIndex >= 0 && pageIndex < this.pages.length) {
      this.pages[pageIndex].name = name;
      this.navigationController.updatePageSelector(this.pages);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.pageSettingsModal.destroy();
    this.navigationController.destroy();
    this.onPageChangeCallback = null;
    this.onPageAddCallback = null;
  }
}
