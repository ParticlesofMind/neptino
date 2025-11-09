/**
 * Messaging Interface Component
 * Handles user search, iframe embedding, and Rocket.Chat integration
 */

import type { User } from "@supabase/supabase-js";
import {
  rocketChatService,
  type RocketChatCredentials,
  type RocketChatUser,
} from "./RocketChatService";
import { supabase } from "../supabase";

interface PlatformUserRow {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

interface MessagingUserResult {
  email: string;
  name: string;
  role?: string;
  username?: string;
  rocketChatId?: string;
  source: "rocket" | "platform";
}

export class MessagingInterface {
  private container!: HTMLElement;
  private currentUser: User | null = null;
  private rocketChatSession: RocketChatCredentials | null = null;
  private iframeMessageHandler: ((event: MessageEvent) => void) | null = null;

  constructor(containerId: string) {
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
      console.error(
        `MessagingInterface: Container with id "${containerId}" not found`,
      );
      return;
    }

    this.container = containerElement;
    this.init();
  }

  private async fetchRocketChatSession(): Promise<RocketChatCredentials | null> {
    if (!this.currentUser?.id) {
      return null;
    }

    try {
      // Query private.user_integrations table
      const { data, error } = await supabase
        .from("user_integrations")
        .select(
          "rocketchat_user_id, rocketchat_auth_token, rocketchat_username",
        )
        .eq("user_id", this.currentUser.id)
        .single();

      if (!error && data?.rocketchat_user_id && data?.rocketchat_auth_token) {
        return {
          userId: data.rocketchat_user_id,
          authToken: data.rocketchat_auth_token,
          username:
            data.rocketchat_username ||
            this.currentUser.user_metadata?.full_name ||
            this.currentUser.email?.split("@")[0] || 'user',
        };
      }

      // For now, always return null to use admin credentials fallback
      // This ensures seamless authentication without TOTP issues
      console.log("No Rocket.Chat credentials found for user, using admin fallback");
      return null;
    } catch (error) {
      console.error("Failed to fetch Rocket.Chat credentials:", error);
      return null;
    }
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

      const isAvailable = await rocketChatService.isServiceAvailable();
      if (!isAvailable) {
        // Service not ready - show helpful message instead of fallback
        this.showRocketChatSetupMessage();
        return;
      }

      await this.initializeMessaging();
    } catch (error) {
      console.error("Unexpected error during messaging init:", error);
      this.showError(
        "We could not connect to the messaging service. Check your network connection and try again.",
      );
    }
  }

  private async initializeMessaging(): Promise<void> {
    try {
      let credentials = await this.fetchRocketChatSession();

      // Fallback: use admin credentials if user credentials not found
      if (!credentials) {
        const adminToken = import.meta.env.VITE_ROCKETCHAT_ADMIN_TOKEN;
        const adminUserId = import.meta.env.VITE_ROCKETCHAT_ADMIN_USER_ID;
        
        if (adminToken && adminUserId) {
          credentials = {
            authToken: adminToken,
            userId: adminUserId,
            username: this.currentUser?.user_metadata?.full_name || 
                     this.currentUser?.email?.split("@")[0] || 
                     'User'
          };
        } else {
          this.showError(
            "Messaging access is not ready yet. Please sign out and sign back in to refresh your messaging permissions.",
          );
          return;
        }
      }

      this.rocketChatSession = credentials;
      this.renderMessagingInterface();
    } catch (error) {
      console.error("MessagingInterface initialization error:", error);
      this.showError("Failed to initialize messaging interface");
    }
  }

  private renderMessagingInterface(): void {
    const embedUrl = this.getRocketChatEmbedUrl();

    this.container.innerHTML = `
      <div class="messaging-interface">
        <div class="messaging-header">
          <h3>Messages</h3>
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
              src="${embedUrl}"
              frameborder="0"
              allowfullscreen
            ></iframe>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.setupIframeMessaging();
  }

  private showRocketChatSetupMessage(): void {
    const rocketChatUrl = import.meta.env.VITE_ROCKETCHAT_URL || 'http://localhost:3000';
    
    this.container.innerHTML = `
      <div class="messaging-error">
        <h3>🚀 Rocket.Chat Setup Required</h3>
        <p>Rocket.Chat needs to be set up before messaging is available.</p>
        <a href="${rocketChatUrl}" target="_blank" class="button button--primary" style="margin-top: 1rem;">
          Complete Setup
        </a>
        <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--color-text-secondary);">
          After completing the setup wizard, restart the Rocket.Chat service and refresh this page.
        </p>
      </div>
    `;
  }

  private getRocketChatEmbedUrl(): string {
    if (!this.rocketChatSession) {
      return "";
    }

    return rocketChatService.getChannelEmbedUrl(
      this.rocketChatSession.authToken,
      this.rocketChatSession.userId,
    );
  }

  private setupEventListeners(): void {
    const searchInput = document.getElementById(
      "user-search-input",
    ) as HTMLInputElement | null;
    const searchBtn = document.getElementById("search-user-btn");

    if (searchBtn) {
      searchBtn.addEventListener("click", () => this.handleUserSearch());
    }

    if (searchInput) {
      searchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          this.handleUserSearch();
        }
      });
      searchInput.addEventListener("input", () => {
        this.clearSearchMessage();
      });
    }
  }

  private setupIframeMessaging(): void {
    const iframe = document.getElementById(
      "rocketchat-iframe",
    ) as HTMLIFrameElement | null;

    if (!iframe || !this.rocketChatSession) {
      return;
    }

    if (this.iframeMessageHandler) {
      window.removeEventListener("message", this.iframeMessageHandler);
    }

    const loginWithToken = () => {
      this.sendIframeLogin(iframe);
    };

    this.iframeMessageHandler = (event: MessageEvent) => {
      if (!this.isTrustedRocketChatOrigin(event.origin)) {
        return;
      }

      const payload = event.data;
      if (!payload) {
        return;
      }

      const eventName = payload.eventName || payload.event;

      if (eventName === "ready") {
        loginWithToken();
      } else if (eventName === "error") {
        console.error("Rocket.Chat iframe error event:", payload);
        this.showSearchError("Messaging iframe reported an authentication issue.");
      }
    };

    window.addEventListener("message", this.iframeMessageHandler);

    iframe.addEventListener("load", () => {
      window.setTimeout(loginWithToken, 250);
    });
  }

  private sendIframeLogin(iframe: HTMLIFrameElement): void {
    if (!this.rocketChatSession) {
      return;
    }

    const origin = this.getRocketChatOrigin();
    if (!origin) {
      return;
    }

    try {
      iframe.contentWindow?.postMessage(
        {
          event: "login-with-token",
          loginToken: this.rocketChatSession.authToken,
        },
        origin,
      );
    } catch (error) {
      console.error("Failed to send login token to Rocket.Chat iframe:", error);
    }
  }

  private isTrustedRocketChatOrigin(origin: string): boolean {
    const expectedOrigin = this.getRocketChatOrigin();
    if (!expectedOrigin) {
      return false;
    }

    return origin === expectedOrigin;
  }

  private getRocketChatOrigin(): string | null {
    return rocketChatService.getEmbedOrigin();
  }

  private clearSearchMessage(): void {
    this.showSearchMessage("");
  }

  private async handleUserSearch(): Promise<void> {
    const searchInput = document.getElementById(
      "user-search-input",
    ) as HTMLInputElement | null;

    if (!searchInput) {
      return;
    }

    const email = searchInput.value.trim();

    if (!email) {
      this.showSearchError("Please enter an email address");
      return;
    }

    if (!this.rocketChatSession) {
      this.showSearchError("Messaging session is not active");
      return;
    }

    this.showSearchMessage("Searching…");

    const searchResultsContainer = document.getElementById("search-results");
    if (searchResultsContainer) {
      searchResultsContainer.style.display = "block";
    }

    try {
      const [rocketChatUsers, platformResponse] = await Promise.all([
        rocketChatService.searchUsersByEmail(
          email,
          this.rocketChatSession.authToken,
          this.rocketChatSession.userId,
        ),
        supabase
          .from("users")
          .select("id, email, first_name, last_name, role")
          .ilike("email", `%${email}%`),
      ]);

      if (platformResponse.error) {
        console.error(
          "Platform user search error:",
          platformResponse.error.message,
        );
      }

      const platformUsers = (platformResponse.data ||
        []) as PlatformUserRow[];
      const mergedResults = this.mergeUserResults(
        rocketChatUsers,
        platformUsers,
      );

      this.displaySearchResults(mergedResults);

      if (mergedResults.length === 0) {
        this.showSearchMessage("No users found.");
      } else {
        this.showSearchMessage("");
      }
    } catch (error) {
      console.error("User search error:", error);
      this.showSearchError("Failed to search for users");
    }
  }

  private mergeUserResults(
    rocketChatUsers: RocketChatUser[],
    platformUsers: PlatformUserRow[],
  ): MessagingUserResult[] {
    const results = new Map<string, MessagingUserResult>();

    rocketChatUsers.forEach((user) => {
      const email = this.extractRocketChatEmail(user);
      if (!email) {
        return;
      }

      const key = email.toLowerCase();
      if (!results.has(key)) {
        results.set(key, {
          email,
          name: user.name || user.username || email,
          username: user.username,
          rocketChatId: user._id,
          source: "rocket",
        });
      }
    });

    platformUsers.forEach((user) => {
      if (!user.email) {
        return;
      }

      const key = user.email.toLowerCase();
      const existing = results.get(key);
      const displayName = this.composePlatformUserName(user) || user.email;

      if (existing) {
        existing.role = user.role || existing.role;
        if (!existing.name && displayName) {
          existing.name = displayName;
        }
        return;
      }

      results.set(key, {
        email: user.email,
        name: displayName,
        role: user.role || undefined,
        source: "platform",
      });
    });

    return Array.from(results.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  private displaySearchResults(results: MessagingUserResult[]): void {
    const listElement = document.getElementById("search-results-list");
    if (!listElement) {
      return;
    }

    if (results.length === 0) {
      listElement.innerHTML = "";
      return;
    }

    listElement.innerHTML = results
      .map((user) => this.renderSearchResult(user))
      .join("");

    listElement
      .querySelectorAll<HTMLButtonElement>(".start-conversation")
      .forEach((button) => {
        button.addEventListener("click", (event) => {
          const target = event.currentTarget as HTMLButtonElement;
          const email = target.getAttribute("data-email");
          const username = target.getAttribute("data-username") || undefined;

          if (email) {
            this.startConversation(email, username);
          }
        });
      });
  }

  private renderSearchResult(user: MessagingUserResult): string {
    const safeEmail = this.escapeHtml(user.email);
    const safeName = this.escapeHtml(user.name);
    const safeRole = user.role ? this.escapeHtml(user.role) : "";
    const safeUsername = user.username
      ? this.escapeHtml(user.username)
      : null;

    const sourceLabel =
      user.source === "rocket" ? "Messaging Enabled" : "Platform User";
    const sourceClass =
      user.source === "rocket"
        ? "user-source user-source--rocket"
        : "user-source user-source--platform";

    const buttonAttributes = [
      'class="button button--small start-conversation"',
      `data-email="${safeEmail}"`,
    ];

    if (safeUsername) {
      buttonAttributes.push(`data-username="${safeUsername}"`);
    } else {
      buttonAttributes.push("disabled");
    }

    const buttonLabel = safeUsername
      ? "Start Conversation"
      : "Messaging Unavailable";

    const roleMarkup = safeRole
      ? `<span class="user-role">${safeRole}</span>`
      : "";

    return `
      <div class="user-result" data-email="${safeEmail}">
        <div class="user-info">
          <strong>${safeName}</strong>
          <span class="user-email">${safeEmail}</span>
          ${roleMarkup}
          <span class="${sourceClass}">${sourceLabel}</span>
        </div>
        <button ${buttonAttributes.join(" ")}>
          ${buttonLabel}
        </button>
      </div>
    `;
  }

  private composePlatformUserName(user: PlatformUserRow): string | null {
    const parts = [user.first_name, user.last_name].filter(
      (value): value is string => Boolean(value),
    );

    if (parts.length === 0) {
      return null;
    }

    return parts.join(" ");
  }

  private extractRocketChatEmail(user: RocketChatUser): string | null {
    if (Array.isArray(user.emails) && user.emails.length > 0) {
      const address = user.emails[0]?.address;
      if (address) {
        return address;
      }
    }

    const fallback = (user as unknown as { email?: string }).email;
    return fallback || null;
  }

  private async startConversation(
    email: string,
    username?: string,
  ): Promise<void> {
    if (!this.rocketChatSession) {
      this.showSearchError("Not authenticated with messaging service");
      return;
    }

    let targetUsername = username;

    try {
      if (!targetUsername) {
        const users = await rocketChatService.searchUsersByEmail(
          email,
          this.rocketChatSession.authToken,
          this.rocketChatSession.userId,
        );

        if (users.length > 0) {
          targetUsername = users[0].username || undefined;
        }
      }

      if (!targetUsername) {
        this.showSearchError("User not found in messaging system");
        return;
      }

      const directRoom = await rocketChatService.createDirectMessage(
        targetUsername,
        this.rocketChatSession.authToken,
        this.rocketChatSession.userId,
      );

      if (!directRoom) {
        this.showSearchError("Failed to start conversation");
        return;
      }

      const iframe = document.getElementById(
        "rocketchat-iframe",
      ) as HTMLIFrameElement | null;

      if (iframe) {
        iframe.src = rocketChatService.getDirectMessageUrl(
          this.rocketChatSession.authToken,
          this.rocketChatSession.userId,
          targetUsername,
        );

        iframe.addEventListener(
          "load",
          () => {
            this.sendIframeLogin(iframe);
          },
          { once: true },
        );
      }

      const searchResults = document.getElementById("search-results");
      if (searchResults) {
        searchResults.style.display = "none";
      }
    } catch (error) {
      console.error("Start conversation error:", error);
      this.showSearchError("Failed to start conversation");
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private showError(message: string): void {
    this.container.innerHTML = `
      <div class="messaging-error">
        <h3>Messaging Unavailable</h3>
        <p>${message}</p>
      </div>
    `;
  }

  private showSearchMessage(
    message: string,
    type: "default" | "error" = "default",
  ): void {
    const messageElement = document.getElementById("search-results-message");
    if (!messageElement) {
      return;
    }

    messageElement.textContent = message;

    if (type === "error") {
      messageElement.classList.add("search-results__message--error");
    } else {
      messageElement.classList.remove("search-results__message--error");
    }
  }

  private showSearchError(message: string): void {
    this.showSearchMessage(message, "error");
  }
}

// Auto-initialize messaging interface when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("rocketchat-container");
  if (container) {
    new MessagingInterface("rocketchat-container");
  }
});
