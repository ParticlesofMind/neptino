/**
 * Rocket.Chat Integration Service
 * Handles user provisioning, token management, and messaging utilities
 */

interface RocketChatEmail {
  address: string;
  verified?: boolean;
}

export interface RocketChatUser {
  _id: string;
  username: string;
  name?: string;
  emails?: RocketChatEmail[];
  active: boolean;
}

interface RocketChatAuthResponse {
  status: string;
  data: {
    authToken: string;
    userId: string;
    me: RocketChatUser;
  };
}

interface RocketChatCreateUserResponse {
  success: boolean;
  user?: RocketChatUser;
  error?: string;
}

interface RocketChatTokenResponse {
  status: string;
  data: {
    authToken: string;
    userId: string;
  };
}

export interface RocketChatCredentials {
  authToken: string;
  userId: string;
  username: string;
}

export class RocketChatService {
  private baseUrl: string;
  private adminToken: string;
  private adminUserId: string;

  constructor() {
    const configuredUrl =
      import.meta.env.VITE_ROCKETCHAT_URL || "http://localhost:3000";

    // Normalize to avoid trailing slash issues
    this.baseUrl = configuredUrl.replace(/\/+$/, "");
    this.adminToken = import.meta.env.VITE_ROCKETCHAT_ADMIN_TOKEN || "";
    this.adminUserId = import.meta.env.VITE_ROCKETCHAT_ADMIN_USER_ID || "";
  }

  /**
   * Expose base URL for iframe origin checks
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Create a new user in Rocket.Chat (idempotent helper)
   */
  async createUser(
    email: string,
    password: string,
    name: string,
    username?: string,
  ): Promise<RocketChatCreateUserResponse> {
    if (!this.hasAdminCredentials()) {
      console.warn(
        "Rocket.Chat admin credentials missing - skipping user creation",
      );
      return { success: false, error: "Missing admin credentials" };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/users.create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": this.adminToken,
          "X-User-Id": this.adminUserId,
        },
        body: JSON.stringify({
          email,
          password,
          name,
          username: username || email.split("@")[0],
          verified: true,
          requirePasswordChange: false,
          sendWelcomeEmail: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          user: data.user,
        };
      }

      return {
        success: false,
        error: data.error || "Failed to create user",
      };
    } catch (error) {
      console.error("Rocket.Chat user creation error:", error);
      return {
        success: false,
        error: "Network error during user creation",
      };
    }
  }

  /**
   * Authenticate a user and get auth token (fallback when admin token is unavailable)
   */
  async authenticateUser(
    email: string,
    password: string,
  ): Promise<RocketChatAuthResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: email,
          password,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        return data;
      }

      console.error("Rocket.Chat authentication failed:", data);
      return null;
    } catch (error) {
      console.error("Rocket.Chat authentication error:", error);
      return null;
    }
  }

  /**
   * Ensure a Rocket.Chat user exists and return credentials for iframe auth
   * Uses admin token to provision accounts and generate tokens.
   */
  async ensureUserCredentials(
    email: string,
    password: string,
    name: string,
  ): Promise<RocketChatCredentials | null> {
    const normalizedName = name || email.split("@")[0];
    const normalizedUsername = this.getSafeUsername(email);

    try {
      let user = await this.adminFetchUserByEmail(email);

      // Create the user if they don't already exist
      if (!user) {
        const createResult = await this.createUser(
          email,
          password,
          normalizedName,
          normalizedUsername,
        );

        if (!createResult.success) {
          const isDuplicate =
            typeof createResult.error === "string" &&
            createResult.error.toLowerCase().includes("already");

          if (!isDuplicate) {
            console.error(
              "Rocket.Chat ensureUserCredentials create error:",
              createResult.error,
            );
            return null;
          }
        }

        // Fetch again to confirm creation (covers duplicate case)
        user = await this.adminFetchUserByEmail(email);
      }

      if (!user) {
        console.error(
          "Rocket.Chat ensureUserCredentials failed - user not found after creation attempt",
        );
        return null;
      }

      // Generate a new token for the user using admin privileges
      const tokenResponse = await this.createTokenForUser(user._id);

      if (tokenResponse?.status === "success") {
        return {
          authToken: tokenResponse.data.authToken,
          userId: tokenResponse.data.userId,
          username: user.username || normalizedUsername,
        };
      }

      console.warn(
        "Falling back to password-based Rocket.Chat authentication for token",
      );

      // Fallback to password-based authentication if admin token generation fails
      const login = await this.authenticateUser(email, password);
      if (login?.data?.authToken && login?.data?.userId) {
        return {
          authToken: login.data.authToken,
          userId: login.data.userId,
          username: login.data.me.username,
        };
      }

      return null;
    } catch (error) {
      console.error("Rocket.Chat ensureUserCredentials error:", error);
      return null;
    }
  }

  /**
   * Search for users by email using the current user's token
   */
  async searchUsersByEmail(
    email: string,
    authToken: string,
    userId: string,
  ): Promise<RocketChatUser[]> {
    try {
      const query = encodeURIComponent(
        JSON.stringify({
          "emails.address": email,
        }),
      );

      const response = await fetch(
        `${this.baseUrl}/api/v1/users.list?query=${query}`,
        {
          method: "GET",
          headers: {
            "X-Auth-Token": authToken,
            "X-User-Id": userId,
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        return data.users || [];
      }

      console.error("Rocket.Chat user search failed:", data);
      return [];
    } catch (error) {
      console.error("Rocket.Chat user search error:", error);
      return [];
    }
  }

  /**
   * Create (or retrieve) a direct message room between the current user and another user
   */
  async createDirectMessage(
    targetUsername: string,
    authToken: string,
    currentUserId: string,
  ): Promise<{ roomId: string; usernames: string[] } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/im.create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": authToken,
          "X-User-Id": currentUserId,
        },
        body: JSON.stringify({
          username: targetUsername,
        }),
      });

      const data = await response.json();

      if (data.success && data.room) {
        const roomId = data.room._id || data.room.rid || "";
        if (!roomId) {
          console.warn(
            "Rocket.Chat DM creation succeeded but room id missing",
            data.room,
          );
        }

        return {
          roomId,
          usernames: data.room.usernames || [targetUsername],
        };
      }

      console.error("Rocket.Chat DM creation failed:", data);
      return null;
    } catch (error) {
      console.error("Rocket.Chat DM creation error:", error);
      return null;
    }
  }

  /**
   * Get iframe embed URL for a public channel
   */
  getChannelEmbedUrl(
    authToken: string,
    userId: string,
    channelSlug = "general",
  ): string {
    const params = this.buildEmbedParams(authToken, userId);
    return `${this.baseUrl}/channel/${encodeURIComponent(channelSlug)}?${params.toString()}`;
  }

  /**
   * Get iframe embed URL for a direct message conversation
   */
  getDirectMessageUrl(
    authToken: string,
    userId: string,
    username: string,
  ): string {
    const params = this.buildEmbedParams(authToken, userId);
    return `${this.baseUrl}/direct/${encodeURIComponent(username)}?${params.toString()}`;
  }

  /**
   * Check if Rocket.Chat service is reachable
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/info`, {
        method: "GET",
      });
      return response.ok;
    } catch (error) {
      console.error("Rocket.Chat service unavailable:", error);
      return false;
    }
  }

  /**
   * Fetch a user by email using admin privileges
   */
  private async adminFetchUserByEmail(
    email: string,
  ): Promise<RocketChatUser | null> {
    if (!this.hasAdminCredentials()) {
      return null;
    }

    try {
      const query = encodeURIComponent(
        JSON.stringify({
          "emails.address": email,
        }),
      );

      const response = await fetch(
        `${this.baseUrl}/api/v1/users.list?query=${query}`,
        {
          method: "GET",
          headers: {
            "X-Auth-Token": this.adminToken,
            "X-User-Id": this.adminUserId,
          },
        },
      );

      const data = await response.json();

      if (data.success && Array.isArray(data.users) && data.users.length > 0) {
        return data.users[0] as RocketChatUser;
      }

      return null;
    } catch (error) {
      console.error("Rocket.Chat adminFetchUserByEmail error:", error);
      return null;
    }
  }

  /**
   * Generate a token for a user using admin credentials
   */
  private async createTokenForUser(
    userId: string,
  ): Promise<RocketChatTokenResponse | null> {
    if (!this.hasAdminCredentials()) {
      console.warn(
        "Rocket.Chat admin credentials missing - cannot generate user token",
      );
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/users.createToken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": this.adminToken,
          "X-User-Id": this.adminUserId,
        },
        body: JSON.stringify({
          userId,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        return data;
      }

      console.error("Rocket.Chat createTokenForUser failed:", data);
      return null;
    } catch (error) {
      console.error("Rocket.Chat createTokenForUser error:", error);
      return null;
    }
  }

  /**
   * Build shared embed parameters for iframe URLs
   */
  private buildEmbedParams(
    authToken: string,
    userId: string,
  ): URLSearchParams {
    const params = new URLSearchParams({
      layout: "embedded",
      token: authToken,
      userId,
    });

    return params;
  }

  /**
   * Ensure admin credentials are configured before calling privileged endpoints
   */
  private hasAdminCredentials(): boolean {
    return Boolean(this.adminToken && this.adminUserId);
  }

  /**
   * Derive a safe username from an email address
   */
  private getSafeUsername(email: string): string {
    const prefix = email.split("@")[0] || "user";
    return prefix.replace(/[^a-zA-Z0-9._-]/g, "");
  }
}

// Export singleton instance for reuse
export const rocketChatService = new RocketChatService();
