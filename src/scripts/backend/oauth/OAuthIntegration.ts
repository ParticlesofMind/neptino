/**
 * OAuth Integration Helper
 * Provides utilities for integrating OAuth/OIDC with Neptino's existing auth system
 */

// Note: This file is designed to be used in the browser context
// The Supabase client will be available globally in the browser

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
}

export class OAuthIntegration {
  private static readonly OAUTH_SERVER_URL = 'http://localhost:3001';
  
  /**
   * Generate OAuth authorization URL for Rocket.Chat
   */
  static generateAuthUrl(config: OAuthConfig): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope || 'openid profile email',
      state: config.state || Math.random().toString(36).substring(2, 15)
    });

    return `${this.OAUTH_SERVER_URL}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Check if user is authenticated and redirect to OAuth if needed
   */
  static async checkAuthAndRedirect(config: OAuthConfig): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      // User not authenticated, redirect to login
      const loginUrl = `/src/pages/shared/signin.html?redirect_uri=${encodeURIComponent(window.location.href)}`;
      window.location.href = loginUrl;
      return false;
    }

    // User is authenticated, proceed with OAuth flow
    const authUrl = this.generateAuthUrl(config);
    window.location.href = authUrl;
    return true;
  }

  /**
   * Handle OAuth callback and extract authorization code
   */
  static handleCallback(): { code: string | null; state: string | null; error: string | null } {
    const urlParams = new URLSearchParams(window.location.search);
    
    return {
      code: urlParams.get('code'),
      state: urlParams.get('state'),
      error: urlParams.get('error')
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(
    code: string, 
    redirectUri: string, 
    clientId: string, 
    clientSecret: string
  ): Promise<{ accessToken?: string; idToken?: string; error?: string }> {
    try {
      const response = await fetch(`${this.OAUTH_SERVER_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { error: `Token exchange failed: ${error}` };
      }

      const tokens = await response.json();
      return {
        accessToken: tokens.access_token,
        idToken: tokens.id_token
      };
    } catch (error) {
      return { error: `Token exchange error: ${error}` };
    }
  }

  /**
   * Get user info from access token
   */
  static async getUserInfo(accessToken: string): Promise<{ userInfo?: any; error?: string }> {
    try {
      const response = await fetch(`${this.OAUTH_SERVER_URL}/oauth/userinfo`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        return { error: `UserInfo request failed: ${error}` };
      }

      const userInfo = await response.json();
      return { userInfo };
    } catch (error) {
      return { error: `UserInfo error: ${error}` };
    }
  }

  /**
   * Create Rocket.Chat OAuth URL for seamless integration
   */
  static createRocketChatOAuthUrl(): string {
    const config: OAuthConfig = {
      clientId: 'rocketchat',
      redirectUri: 'http://localhost:3000/_oauth/neptino', // This should match Rocket.Chat's callback URL
      scope: 'openid profile email',
      state: `rocketchat_${Date.now()}`
    };

    return this.generateAuthUrl(config);
  }

  /**
   * Handle Rocket.Chat OAuth flow
   */
  static async handleRocketChatOAuth(): Promise<void> {
    const isAuthenticated = await this.checkAuthAndRedirect({
      clientId: 'rocketchat',
      redirectUri: 'http://localhost:3000/_oauth/neptino',
      scope: 'openid profile email'
    });

    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login...');
      return;
    }

    console.log('User authenticated, proceeding with OAuth flow...');
  }
}

/**
 * Utility function to add OAuth button to existing pages
 */
export function addOAuthButton(containerId: string, buttonText: string = 'Open Messages'): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  const button = document.createElement('button');
  button.textContent = buttonText;
  button.className = 'oauth-button';
  button.onclick = () => OAuthIntegration.handleRocketChatOAuth();

  // Add some basic styling
  button.style.cssText = `
    background-color: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    margin: 10px 0;
  `;

  container.appendChild(button);
}

/**
 * Initialize OAuth integration on page load
 */
export function initOAuthIntegration(): void {
  // Check if we're on a callback page
  const callback = OAuthIntegration.handleCallback();
  
  if (callback.code) {
    console.log('OAuth callback received:', callback);
    // Handle the callback - in a real implementation, you'd exchange the code for tokens
    // and then redirect to Rocket.Chat or handle the integration
  }
}
