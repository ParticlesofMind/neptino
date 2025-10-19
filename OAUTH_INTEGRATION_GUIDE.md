# 🔐 OAuth 2.0 + OpenID Connect Integration Guide

## Overview

This guide explains how to set up Neptino as an OAuth 2.0 + OpenID Connect identity provider for Rocket.Chat, eliminating the need for duplicate user signups.

## 🚀 Quick Start

### 1. Start the OAuth Server

```bash
# Terminal 1: Start Supabase (if not already running)
supabase start

# Terminal 2: Start Neptino frontend
npm run dev

# Terminal 3: Start OAuth server
npm run dev:oauth

# Or start everything at once:
npm run dev:full
```

### 2. Test the Integration

Visit: http://localhost:3000/src/pages/oauth-test.html

## 📋 What's Implemented

### OAuth 2.0 + OpenID Connect Server
- **Authorization Endpoint**: `/oauth/authorize`
- **Token Endpoint**: `/oauth/token`
- **UserInfo Endpoint**: `/oauth/userinfo`
- **Discovery Endpoint**: `/.well-known/openid-configuration`
- **JWKS Endpoint**: `/oauth/jwks`

### ID Token Claims
The server issues ID tokens with the following claims for Rocket.Chat mapping:

```json
{
  "iss": "https://neptino.example",
  "sub": "user_12345",
  "email": "alice@example.org",
  "email_verified": true,
  "name": "Alice Example",
  "roles": ["teacher"]
}
```

### User Role Mapping
- **Admin**: `["admin"]`
- **Teacher**: `["teacher"]`
- **Student**: `["student"]`

## 🔧 Rocket.Chat Configuration

### One-time Admin Setup

1. **Access Rocket.Chat Admin Panel**
   - Go to Administration → Workspace → Settings → OAuth
   - Click "Add custom OAuth"

2. **Configure OAuth Settings**
   ```
   Authorization URL: http://localhost:3001/oauth/authorize
   Token URL: http://localhost:3001/oauth/token
   User Info URL: http://localhost:3001/oauth/userinfo
   Client ID: rocketchat
   Client Secret: rocketchat-secret
   ```

3. **Enable Auto-Registration**
   - ✅ **Auto register users** - Creates accounts on first OAuth login
   - ✅ **Roles/Groups field name** → `roles`
   - ✅ **Merge roles from SSO** - Syncs roles on each login

4. **Set Callback URL**
   - Use the callback URL shown by Rocket.Chat (e.g., `http://localhost:3000/_oauth/neptino`)
   - Update the OAuth server configuration to match

### Optional: Channel Auto-Membership

Configure OAuth Group Channel Map in Rocket.Chat:
```json
{
  "admin": ["#staff"],
  "teacher": ["#staff", "#teachers"],
  "student": ["#general", "#students"]
}
```

## 🔄 User Experience Flow

1. **User signs up/logs in to Neptino** with email/password
2. **User clicks "Messages"** in Neptino
3. **Browser redirects to Rocket.Chat OAuth** endpoint
4. **OAuth flow completes silently** (user already authenticated)
5. **Rocket.Chat auto-creates user** if missing, assigns role, opens chat
6. **User can message anyone** by searching their Neptino email

## 🛠️ Development Setup

### Environment Variables

Add to your `.env.local` file:

```bash
# OAuth Server Configuration
OAUTH_PORT=3001
JWT_SECRET=neptino-oauth-secret-key-change-in-production
JWT_ISSUER=https://neptino.example

# Rocket.Chat OAuth Client Configuration
ROCKETCHAT_CLIENT_SECRET=rocketchat-secret

# Supabase Configuration (should already exist)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### File Structure

```
src/scripts/backend/oauth/
├── oidc-server.ts          # Main OAuth/OIDC server
├── start-server.ts         # Server startup script
└── OAuthIntegration.ts     # Frontend integration utilities

src/pages/
└── oauth-test.html         # Test page for OAuth integration
```

## 🧪 Testing

### 1. Test OAuth Server Endpoints

```bash
# Test discovery endpoint
curl http://localhost:3001/.well-known/openid-configuration

# Test health endpoint
curl http://localhost:3001/health
```

### 2. Test Full OAuth Flow

1. Visit http://localhost:3000/src/pages/oauth-test.html
2. Click "Test OAuth Flow"
3. Verify redirect to authorization endpoint
4. Check that user is authenticated

### 3. Test with Rocket.Chat

1. Configure Rocket.Chat with the OAuth settings above
2. Create a test user in Neptino
3. Try accessing Rocket.Chat through the OAuth flow
4. Verify user is auto-created with correct role

## 🔒 Security Considerations

### Production Deployment

1. **Use HTTPS** for all endpoints
2. **Generate secure JWT secrets** (256-bit random keys)
3. **Validate redirect URIs** strictly
4. **Implement rate limiting** on OAuth endpoints
5. **Use proper CORS** configuration
6. **Store client secrets securely**

### JWT Security

- Tokens expire in 1 hour
- Use strong, random JWT secrets
- Validate token signatures on all requests
- Implement token refresh if needed

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid client" error**
   - Check client ID and secret match configuration
   - Verify redirect URI is whitelisted

2. **"Invalid redirect URI" error**
   - Ensure callback URL matches exactly
   - Check for trailing slashes

3. **User not auto-created in Rocket.Chat**
   - Enable "Auto register users" in Rocket.Chat settings
   - Check "Roles/Groups field name" is set to `roles`

4. **OAuth server not starting**
   - Check port 3001 is available
   - Verify all dependencies are installed
   - Check environment variables are set

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=oauth:*
npm run dev:oauth
```

## 📚 API Reference

### OAuth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/openid-configuration` | GET | OpenID Connect discovery |
| `/oauth/authorize` | GET | Authorization endpoint |
| `/oauth/token` | POST | Token exchange endpoint |
| `/oauth/userinfo` | GET | User information endpoint |
| `/oauth/jwks` | GET | JSON Web Key Set |
| `/health` | GET | Health check |

### Frontend Integration

```typescript
import { OAuthIntegration } from '../scripts/backend/oauth/OAuthIntegration.js';

// Generate OAuth URL
const authUrl = OAuthIntegration.generateAuthUrl({
  clientId: 'rocketchat',
  redirectUri: 'http://localhost:3000/_oauth/neptino',
  scope: 'openid profile email'
});

// Handle OAuth flow
await OAuthIntegration.handleRocketChatOAuth();

// Add OAuth button to page
addOAuthButton('oauth-container', 'Open Messages');
```

## 🎯 Next Steps

1. **Test the integration** with Rocket.Chat
2. **Configure production environment** variables
3. **Set up HTTPS** for production deployment
4. **Implement additional security** measures
5. **Add monitoring and logging** for OAuth flows

## 📞 Support

For issues or questions:
1. Check the test page: http://localhost:3000/src/pages/oauth-test.html
2. Review the OAuth server logs
3. Verify Rocket.Chat configuration
4. Test individual endpoints manually

