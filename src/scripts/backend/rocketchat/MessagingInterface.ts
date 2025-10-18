/**
 * Messaging Interface Component
 * Handles user search, iframe embedding, and Rocket.Chat integration
 */

import { rocketChatService } from './RocketChatService';
import { supabase } from '../supabase';

interface UserSearchResult {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class MessagingInterface {
  private container: HTMLElement;
  private currentUser: any;
  private rocketChatAuth: any = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`MessagingInterface: Container with id "${containerId}" not found`);
      return;
    }

    this.init();
  }

  private async init(): Promise<void> {
    // Get current user from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    this.currentUser = user;

    if (!this.currentUser) {
      this.showError('Please log in to access messaging');
      return;
    }

    // Check if Rocket.Chat service is available
    const isAvailable = await rocketChatService.isServiceAvailable();
    if (!isAvailable) {
      this.showError('Messaging service is currently unavailable. Please try again later.');
      return;
    }

    // Initialize the messaging interface
    await this.initializeMessaging();
  }

  private async initializeMessaging(): Promise<void> {
    try {
      // Authenticate with Rocket.Chat
      this.rocketChatAuth = await rocketChatService.authenticateUser(
        this.currentUser.email,
        'temp_password' // This should be handled securely
      );

      if (!this.rocketChatAuth) {
        // If authentication fails, try to create the user
        const createResult = await rocketChatService.createUser(
          this.currentUser.email,
          'temp_password',
          this.currentUser.user_metadata?.full_name || this.currentUser.email
        );

        if (createResult.success) {
          // Try authentication again
          this.rocketChatAuth = await rocketChatService.authenticateUser(
            this.currentUser.email,
            'temp_password'
          );
        }
      }

      if (this.rocketChatAuth) {
        this.renderMessagingInterface();
      } else {
        this.showError('Unable to connect to messaging service');
      }
    } catch (error) {
      console.error('MessagingInterface initialization error:', error);
      this.showError('Failed to initialize messaging interface');
    }
  }

  private renderMessagingInterface(): void {
    this.container.innerHTML = `
      <div class="messaging-interface">
        <div class="messaging-header">
          <h3>Messages</h3>
          <div class="user-search">
            <input 
              type="email" 
              id="user-search-input" 
              placeholder="Search users by email..." 
              class="search-input"
            />
            <button id="search-user-btn" class="button button--primary">Search</button>
          </div>
        </div>
        
        <div class="messaging-content">
          <div class="search-results" id="search-results" style="display: none;">
            <h4>Search Results</h4>
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
  }

  private getRocketChatEmbedUrl(): string {
    if (!this.rocketChatAuth) {
      return '';
    }

    return rocketChatService.getEmbedUrl(
      this.rocketChatAuth.data.authToken,
      this.rocketChatAuth.data.userId
    );
  }

  private setupEventListeners(): void {
    const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
    const searchBtn = document.getElementById('search-user-btn');
    const searchResults = document.getElementById('search-results');

    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.handleUserSearch());
    }

    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleUserSearch();
        }
      });
    }
  }

  private async handleUserSearch(): Promise<void> {
    const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
    const email = searchInput.value.trim();

    if (!email) {
      this.showSearchError('Please enter an email address');
      return;
    }

    if (!this.rocketChatAuth) {
      this.showSearchError('Not authenticated with messaging service');
      return;
    }

    try {
      // Search for users in Rocket.Chat
      const rocketChatUsers = await rocketChatService.searchUsersByEmail(
        email,
        this.rocketChatAuth.data.authToken,
        this.rocketChatAuth.data.userId
      );

      // Also search in our platform database
      const { data: platformUsers } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role')
        .ilike('email', `%${email}%`);

      this.displaySearchResults(rocketChatUsers, platformUsers || []);
    } catch (error) {
      console.error('User search error:', error);
      this.showSearchError('Failed to search for users');
    }
  }

  private displaySearchResults(rocketChatUsers: any[], platformUsers: any[]): void {
    const searchResultsList = document.getElementById('search-results-list');
    const searchResults = document.getElementById('search-results');

    if (!searchResultsList || !searchResults) return;

    // Combine and deduplicate results
    const allUsers = [...rocketChatUsers, ...platformUsers];
    const uniqueUsers = allUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.email === user.email)
    );

    if (uniqueUsers.length === 0) {
      searchResultsList.innerHTML = '<p>No users found</p>';
    } else {
      searchResultsList.innerHTML = uniqueUsers.map(user => `
        <div class="user-result" data-email="${user.email}">
          <div class="user-info">
            <strong>${user.name || user.first_name || user.email}</strong>
            <span class="user-email">${user.email}</span>
            ${user.role ? `<span class="user-role">${user.role}</span>` : ''}
          </div>
          <button class="button button--small start-conversation" data-email="${user.email}">
            Start Conversation
          </button>
        </div>
      `).join('');

      // Add event listeners to start conversation buttons
      searchResultsList.querySelectorAll('.start-conversation').forEach(button => {
        button.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const email = target.getAttribute('data-email');
          if (email) {
            this.startConversation(email);
          }
        });
      });
    }

    searchResults.style.display = 'block';
  }

  private async startConversation(email: string): Promise<void> {
    if (!this.rocketChatAuth) {
      this.showSearchError('Not authenticated with messaging service');
      return;
    }

    try {
      // Find the user in Rocket.Chat
      const users = await rocketChatService.searchUsersByEmail(
        email,
        this.rocketChatAuth.data.authToken,
        this.rocketChatAuth.data.userId
      );

      if (users.length > 0) {
        // Create or get direct message channel
        const channelId = await rocketChatService.createDirectMessage(
          this.rocketChatAuth.data.userId,
          users[0]._id,
          this.rocketChatAuth.data.authToken,
          this.rocketChatAuth.data.userId
        );

        if (channelId) {
          // Update iframe to show the direct message
          const iframe = document.getElementById('rocketchat-iframe') as HTMLIFrameElement;
          if (iframe) {
            iframe.src = rocketChatService.getEmbedUrl(
              this.rocketChatAuth.data.authToken,
              this.rocketChatAuth.data.userId,
              channelId
            );
          }

          // Hide search results
          const searchResults = document.getElementById('search-results');
          if (searchResults) {
            searchResults.style.display = 'none';
          }
        } else {
          this.showSearchError('Failed to start conversation');
        }
      } else {
        this.showSearchError('User not found in messaging system');
      }
    } catch (error) {
      console.error('Start conversation error:', error);
      this.showSearchError('Failed to start conversation');
    }
  }

  private showError(message: string): void {
    this.container.innerHTML = `
      <div class="messaging-error">
        <h3>Messaging Unavailable</h3>
        <p>${message}</p>
      </div>
    `;
  }

  private showSearchError(message: string): void {
    const searchResults = document.getElementById('search-results-list');
    if (searchResults) {
      searchResults.innerHTML = `<p class="error">${message}</p>`;
    }
  }
}

// Auto-initialize messaging interface when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('rocketchat-container');
  if (container) {
    new MessagingInterface('rocketchat-container');
  }
});