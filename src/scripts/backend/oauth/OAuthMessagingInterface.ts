/**
 * OAuth-Integrated Messaging Interface Component
 * Handles OAuth flow and Rocket.Chat integration with seamless authentication
 */

import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { OAuthIntegration } from "../oauth/OAuthIntegration";

interface MessagingUserResult {
  email: string;
  name: string;
  role?: string;
  username?: string;
  rocketChatId?: string;
  source: "rocket" | "platform";
}

export class OAuthMessagingInterface {
  private container: HTMLElement;
  private currentUser: User | null = null;
  private oauthTokens: { accessToken?: string; idToken?: string } | null = null;

  constructor(containerId: string) {
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
      console.error(
        `OAuthMessagingInterface: Container with id "${containerId}" not found`,
      );
      return;
    }

    this.container = containerElement;
    this.init();
  }

  private async init(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Failed to retrieve user session:", error);
        this.showError(
          "Unable to reach the authentication service. Please refresh the page once your connection is restored.",
        );
        return;
      }

      this.currentUser = data.user;

      if (!this.currentUser) {
        this.showError("Please log in to access messaging");
        return;
      }

      await this.initializeOAuthMessaging();
    } catch (error) {
      console.error("Unexpected error during messaging init:", error);
      this.showError(
        "We could not connect to the messaging service. Check your network connection and try again.",
      );
    }
  }

  private async initializeOAuthMessaging(): Promise<void> {
    try {
      // Check if we're on a callback page
      const callback = OAuthIntegration.handleCallback();
      
      if (callback.code) {
        console.log("OAuth callback received, exchanging code for tokens...");
        await this.handleOAuthCallback(callback);
        return;
      }

      // Check if we already have valid tokens
      if (this.oauthTokens?.accessToken) {
        console.log("Using existing OAuth tokens");
        this.renderMessagingInterface();
        return;
      }

      // Start OAuth flow
      console.log("Starting OAuth flow for Rocket.Chat integration...");
      await this.startOAuthFlow();
    } catch (error) {
      console.error("OAuth messaging initialization error:", error);
      this.showError("Failed to initialize OAuth messaging interface");
    }
  }

  private async startOAuthFlow(): Promise<void> {
    try {
      // Show loading state
      this.showLoading("Connecting to messaging service...");

      // Generate OAuth URL and redirect
      const authUrl = OAuthIntegration.createRocketChatOAuthUrl();
      console.log("Redirecting to OAuth authorization:", authUrl);
      
      // Redirect to OAuth authorization endpoint
      window.location.href = authUrl;
    } catch (error) {
      console.error("OAuth flow error:", error);
      this.showError("Failed to start OAuth authentication flow");
    }
  }

  private async handleOAuthCallback(callback: { code: string; state: string | null; error: string | null }): Promise<void> {
    try {
      if (callback.error) {
        this.showError(`OAuth error: ${callback.error}`);
        return;
      }

      if (!callback.code) {
        this.showError("No authorization code received");
        return;
      }

      this.showLoading("Completing authentication...");

      // Exchange authorization code for tokens
      const tokens = await OAuthIntegration.exchangeCodeForTokens(
        callback.code,
        'http://localhost:3000/_oauth/neptino', // This should match Rocket.Chat's callback URL
        'rocketchat',
        'rocketchat-secret'
      );

      if (tokens.error) {
        this.showError(`Token exchange failed: ${tokens.error}`);
        return;
      }

      this.oauthTokens = {
        accessToken: tokens.accessToken,
        idToken: tokens.idToken
      };

      console.log("OAuth tokens received successfully");
      
      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, document.title, url.toString());

      // Render the messaging interface
      this.renderMessagingInterface();
    } catch (error) {
      console.error("OAuth callback handling error:", error);
      this.showError("Failed to complete OAuth authentication");
    }
  }

  private renderMessagingInterface(): void {
    // Get user info from OAuth token
    this.getUserInfoFromToken().then(userInfo => {
      this.container.innerHTML = `
        <div class="messaging-interface">
          <div class="messaging-header">
            <h3>Messages</h3>
            <div class="user-info">
              <span class="user-name">Welcome, ${userInfo?.name || this.currentUser?.email || 'User'}!</span>
              <span class="user-role">${userInfo?.roles?.[0] || 'User'}</span>
            </div>
            <div class="user-search">
              <input 
                type="email" 
                id="user-search-input" 
                placeholder="Search users by email..." 
                aria-label="Search users by email"
                class="search-input"
              />
              <button id="search-user-btn" class="button button--primary">Search</button>
            </div>
          </div>
          
          <div class="messaging-content">
            <div class="search-results" id="search-results" style="display: none;">
              <h4>Search Results</h4>
              <div id="search-results-message" class="search-results__message"></div>
              <div id="search-results-list"></div>
            </div>
            
            <div class="rocketchat-iframe-container">
              <iframe 
                id="rocketchat-iframe"
                src="${this.getRocketChatEmbedUrl()}"
                frameborder="0"
                allowfullscreen
              ></iframe>
            </div>
          </div>
        </div>
      `;

      this.setupEventListeners();
      this.setupIframeMessaging();
    });
  }

  private async getUserInfoFromToken(): Promise<any> {
    if (!this.oauthTokens?.accessToken) {
      return null;
    }

    try {
      const result = await OAuthIntegration.getUserInfo(this.oauthTokens.accessToken);
      return result.userInfo;
    } catch (error) {
      console.error("Failed to get user info from token:", error);
      return null;
    }
  }

  private getRocketChatEmbedUrl(): string {
    // For now, we'll use a simple Rocket.Chat URL
    // In a real implementation, this would be configured based on your Rocket.Chat setup
    const rocketChatUrl = import.meta.env.VITE_ROCKETCHAT_URL || 'http://localhost:3100';
    
    // If we have OAuth tokens, we could potentially pass them to Rocket.Chat
    // For now, we'll use the basic embed URL
    return `${rocketChatUrl}/channel/general`;
  }

  private setupEventListeners(): void {
    const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
    const searchButton = document.getElementById('search-user-btn') as HTMLButtonElement;

    if (searchInput && searchButton) {
      const performSearch = () => {
        const email = searchInput.value.trim();
        if (email) {
          this.searchUsers(email);
        }
      };

      searchButton.addEventListener('click', performSearch);
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          performSearch();
        }
      });
    }
  }

  private async searchUsers(email: string): Promise<void> {
    const resultsContainer = document.getElementById('search-results');
    const resultsList = document.getElementById('search-results-list');
    const resultsMessage = document.getElementById('search-results-message');

    if (!resultsContainer || !resultsList || !resultsMessage) {
      return;
    }

    try {
      resultsMessage.textContent = 'Searching...';
      resultsContainer.style.display = 'block';
      resultsList.innerHTML = '';

      // Search in Neptino users
      const { data: platformUsers, error: platformError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role')
        .ilike('email', `%${email}%`)
        .limit(5);

      if (platformError) {
        console.error('Platform user search error:', platformError);
      }

      const results: MessagingUserResult[] = [];

      // Add platform users to results
      if (platformUsers) {
        platformUsers.forEach(user => {
          results.push({
            email: user.email,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0],
            role: user.role,
            source: 'platform'
          });
        });
      }

      // Display results
      if (results.length === 0) {
        resultsMessage.textContent = 'No users found matching that email.';
      } else {
        resultsMessage.textContent = `Found ${results.length} user(s):`;
        
        results.forEach(user => {
          const userElement = document.createElement('div');
          userElement.className = 'search-result-item';
          userElement.innerHTML = `
            <div class="user-info">
              <strong>${user.name}</strong>
              <span class="user-email">${user.email}</span>
              ${user.role ? `<span class="user-role">${user.role}</span>` : ''}
            </div>
            <div class="user-actions">
              <button class="button button--small" onclick="this.startChat('${user.email}')">
                Start Chat
              </button>
            </div>
          `;
          resultsList.appendChild(userElement);
        });
      }
    } catch (error) {
      console.error('User search error:', error);
      resultsMessage.textContent = 'Error searching for users. Please try again.';
    }
  }

  private setupIframeMessaging(): void {
    const iframe = document.getElementById('rocketchat-iframe') as HTMLIFrameElement;
    if (!iframe) return;

    // Handle iframe load
    iframe.addEventListener('load', () => {
      console.log('Rocket.Chat iframe loaded');
    });

    // Handle iframe errors
    iframe.addEventListener('error', () => {
      console.error('Rocket.Chat iframe failed to load');
      this.showError('Failed to load messaging interface. Please check your connection.');
    });
  }

  private showLoading(message: string): void {
    this.container.innerHTML = `
      <div class="messaging-loading">
        <div class="loading-spinner"></div>
        <p>${message}</p>
      </div>
    `;
  }

  private showError(message: string): void {
    this.container.innerHTML = `
      <div class="messaging-error">
        <div class="error-icon">⚠️</div>
        <h3>Messaging Unavailable</h3>
        <p>${message}</p>
        <button class="button button--primary" onclick="location.reload()">
          Try Again
        </button>
      </div>
    `;
  }
}

// Initialize OAuth messaging interface when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('rocketchat-container');
  if (container) {
    new OAuthMessagingInterface('rocketchat-container');
  }
});

