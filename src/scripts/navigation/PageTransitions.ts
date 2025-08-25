// ==========================================================================
// PAGE TRANSITION SYSTEM - CUSTOM SMOOTH NAVIGATION
// ==========================================================================

class PageTransitions {
    private isTransitioning = false;
    private transitionDuration = 300; // ms

    constructor() {
        this.init();
    }

    private init(): void {
        // Intercept same-origin navigation clicks
        this.interceptNavigationClicks();
        
        // Handle browser back/forward buttons
        this.handlePopState();
        
        console.log('🔄 Custom page transitions initialized');
    }

    private interceptNavigationClicks(): void {
        document.addEventListener('click', (event: Event) => {
            const target = event.target as HTMLElement;
            const link = target.closest('a[href]') as HTMLAnchorElement;
            
            if (!link || this.shouldIgnoreLink(link)) {
                return;
            }

            // Only handle same-origin links
            if (this.isSameOrigin(link.href)) {
                event.preventDefault();
                this.navigateToPage(link.href);
            }
        });
    }

    private shouldIgnoreLink(link: HTMLAnchorElement): boolean {
        return (
            link.target === '_blank' ||
            link.href.startsWith('mailto:') ||
            link.href.startsWith('tel:') ||
            link.hasAttribute('download') ||
            link.href.includes('#') // Skip hash links for now
        );
    }

    private isSameOrigin(url: string): boolean {
        try {
            const linkURL = new URL(url, window.location.href);
            return linkURL.origin === window.location.origin;
        } catch {
            return false;
        }
    }

    private async navigateToPage(url: string): Promise<void> {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        
        try {
            // Fade out current page
            await this.fadeOut();
            
            // Fetch new page content
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}`);
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const newDocument = parser.parseFromString(html, 'text/html');
            
            // Update page content
            this.updatePageContent(newDocument);
            
            // Update URL and page title
            window.history.pushState({ url }, '', url);
            document.title = newDocument.title || document.title;
            
            // Fade in new content
            await this.fadeIn();
            
        } catch (error) {
            console.error('Page transition error:', error);
            // Fallback to normal navigation
            window.location.href = url;
        } finally {
            this.isTransitioning = false;
        }
    }

    private fadeOut(): Promise<void> {
        return new Promise(resolve => {
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.style.opacity = '0';
                mainContent.style.transform = 'translateY(-10px)';
                mainContent.style.transition = `opacity ${this.transitionDuration}ms ease-out, transform ${this.transitionDuration}ms ease-out`;
            }
            
            setTimeout(resolve, this.transitionDuration);
        });
    }

    private fadeIn(): Promise<void> {
        return new Promise(resolve => {
            const mainContent = document.querySelector('main');
            if (mainContent) {
                // Reset to visible
                mainContent.style.opacity = '1';
                mainContent.style.transform = 'translateY(0)';
            }
            
            setTimeout(resolve, this.transitionDuration);
        });
    }

    private updatePageContent(newDocument: Document): void {
        // Update main content
        const currentMain = document.querySelector('main');
        const newMain = newDocument.querySelector('main');
        if (currentMain && newMain) {
            currentMain.innerHTML = newMain.innerHTML;
        }

        // Update header if it exists and is different
        const currentHeader = document.querySelector('header');
        const newHeader = newDocument.querySelector('header');
        if (currentHeader && newHeader && currentHeader.innerHTML !== newHeader.innerHTML) {
            currentHeader.innerHTML = newHeader.innerHTML;
        }

        // Re-initialize any JavaScript that needs to run on the new content
        this.reinitializeScripts();
    }

    private reinitializeScripts(): void {
        // Re-initialize auth forms if on auth page
        const isAuthPage = window.location.pathname.includes('signin') || 
                          window.location.pathname.includes('signup');
        
        if (isAuthPage) {
            import('../backend/auth/auth').then(({ AuthFormHandler }) => {
                new AuthFormHandler();
                console.log('🔐 Auth form handler reinitialized');
            }).catch(err => console.warn('Could not load AuthFormHandler:', err));
        }

        // Re-initialize global navigation
        import('./GlobalNavigation').then(({ initializeGlobalNavigation }) => {
            initializeGlobalNavigation();
        }).catch(err => console.warn('Could not reinitialize navigation:', err));

        // Re-intercept navigation clicks for new content
        this.interceptNavigationClicks();
    }

    private handlePopState(): void {
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.url) {
                // Handle back/forward button navigation
                this.navigateToPage(event.state.url);
            }
        });
    }
}

export default PageTransitions;
