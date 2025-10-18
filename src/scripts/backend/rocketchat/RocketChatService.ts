/**
 * Rocket.Chat Integration Service
 * Handles user creation, authentication, and messaging functionality
 */

interface RocketChatUser {
  _id: string;
  username: string;
  email: string;
  name: string;
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

export class RocketChatService {
  private baseUrl: string;
  private adminToken: string;
  private adminUserId: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_ROCKETCHAT_URL || 'http://localhost:3001';
    this.adminToken = import.meta.env.VITE_ROCKETCHAT_ADMIN_TOKEN || '';
    this.adminUserId = import.meta.env.VITE_ROCKETCHAT_ADMIN_USER_ID || '';
  }

  /**
   * Create a new user in Rocket.Chat
   */
  async createUser(email: string, password: string, name: string): Promise<RocketChatCreateUserResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/users.create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': this.adminToken,
          'X-User-Id': this.adminUserId,
        },
        body: JSON.stringify({
          email,
          password,
          name,
          username: email.split('@')[0], // Use email prefix as username
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
      } else {
        return {
          success: false,
          error: data.error || 'Failed to create user',
        };
      }
    } catch (error) {
      console.error('Rocket.Chat user creation error:', error);
      return {
        success: false,
        error: 'Network error during user creation',
      };
    }
  }

  /**
   * Authenticate a user and get auth token
   */
  async authenticateUser(email: string, password: string): Promise<RocketChatAuthResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: email,
          password,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        return data;
      } else {
        console.error('Rocket.Chat authentication failed:', data);
        return null;
      }
    } catch (error) {
      console.error('Rocket.Chat authentication error:', error);
      return null;
    }
  }

  /**
   * Search for users by email
   */
  async searchUsersByEmail(email: string, authToken: string, userId: string): Promise<RocketChatUser[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/users.list?query={"emails.address":"${email}"}`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': authToken,
          'X-User-Id': userId,
        },
      });

      const data = await response.json();

      if (data.success) {
        return data.users || [];
      } else {
        console.error('Rocket.Chat user search failed:', data);
        return [];
      }
    } catch (error) {
      console.error('Rocket.Chat user search error:', error);
      return [];
    }
  }

  /**
   * Create a direct message channel between two users
   */
  async createDirectMessage(userId1: string, userId2: string, authToken: string, currentUserId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/im.create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': authToken,
          'X-User-Id': currentUserId,
        },
        body: JSON.stringify({
          username: userId2,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return data.room._id;
      } else {
        console.error('Rocket.Chat DM creation failed:', data);
        return null;
      }
    } catch (error) {
      console.error('Rocket.Chat DM creation error:', error);
      return null;
    }
  }

  /**
   * Get iframe embed URL with authentication
   */
  getEmbedUrl(authToken: string, userId: string, channelId?: string): string {
    const baseEmbedUrl = `${this.baseUrl}/channel/${channelId || 'general'}`;
    const params = new URLSearchParams({
      token: authToken,
      userId: userId,
    });
    
    return `${baseEmbedUrl}?${params.toString()}`;
  }

  /**
   * Check if Rocket.Chat service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/info`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('Rocket.Chat service unavailable:', error);
      return false;
    }
  }
}

// Export singleton instance
export const rocketChatService = new RocketChatService();