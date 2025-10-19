/**
 * OAuth 2.0 + OpenID Connect Server
 * Implements Neptino as an identity provider for Rocket.Chat
 */

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import { SignJWT, jwtVerify } from 'jose';
import NodeCache from 'node-cache';
// Import Supabase client with Node.js environment variables
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = process.env.OAUTH_PORT || 3001;

// Cache for storing authorization codes and sessions
const codeCache = new NodeCache({ stdTTL: 600 }); // 10 minutes
const sessionCache = new NodeCache({ stdTTL: 3600 }); // 1 hour

// JWT signing key (in production, use a secure random key)
const JWT_SECRET = process.env.JWT_SECRET || 'neptino-oauth-secret-key-change-in-production';
const JWT_ISSUER = process.env.JWT_ISSUER || 'https://neptino.example';

// OAuth client configuration (Rocket.Chat)
const OAUTH_CLIENTS = {
  'rocketchat': {
    clientId: 'rocketchat',
    clientSecret: process.env.ROCKETCHAT_CLIENT_SECRET || 'rocketchat-secret',
    redirectUris: [
      'http://localhost:3000/_oauth/neptino',
      'https://chat.example/_oauth/neptino'
    ],
    scopes: ['openid', 'profile', 'email']
  }
};

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 3600000 // 1 hour
  }
}));

// Helper function to get user from Supabase session
async function getUserFromSession(req: express.Request): Promise<any> {
  const sessionId = req.sessionID;
  const cachedUser = sessionCache.get(sessionId);
  
  if (cachedUser) {
    return cachedUser;
  }

  // Try to get user from Supabase session
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        sessionCache.set(sessionId, user);
        return user;
      }
    } catch (error) {
      console.error('Error verifying Supabase token:', error);
    }
  }

  return null;
}

// Helper function to get user role from database
async function getUserRole(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching user role:', error);
      return 'student'; // Default role
    }

    return data.role || 'student';
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return 'student';
  }
}

// OpenID Connect Discovery Endpoint
app.get('/.well-known/openid-configuration', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  const config = {
    issuer: JWT_ISSUER,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
    jwks_uri: `${baseUrl}/oauth/jwks`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256', 'RS256'],
    scopes_supported: ['openid', 'profile', 'email'],
    claims_supported: ['sub', 'email', 'email_verified', 'name', 'roles'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic']
  };

  res.json(config);
});

// JWKS Endpoint (simplified for development)
app.get('/oauth/jwks', (req, res) => {
  // In production, you'd generate proper RSA keys
  // For now, we'll use HMAC which doesn't need JWKS
  res.json({
    keys: []
  });
});

// Authorization Endpoint
app.get('/oauth/authorize', async (req, res) => {
  const { 
    client_id, 
    redirect_uri, 
    response_type, 
    scope, 
    state,
    nonce 
  } = req.query;

  // Validate client
  const client = OAUTH_CLIENTS[client_id as string];
  if (!client) {
    return res.status(400).json({ error: 'invalid_client' });
  }

  // Validate redirect URI
  if (!client.redirectUris.includes(redirect_uri as string)) {
    return res.status(400).json({ error: 'invalid_redirect_uri' });
  }

  // Validate response type
  if (response_type !== 'code') {
    return res.status(400).json({ error: 'unsupported_response_type' });
  }

  // Check if user is authenticated
  const user = await getUserFromSession(req);
  if (!user) {
    // Redirect to Neptino login page
    const loginUrl = `http://localhost:3000/src/pages/shared/signin.html?redirect_uri=${encodeURIComponent(req.url)}`;
    return res.redirect(loginUrl);
  }

  // Generate authorization code
  const authCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Store authorization code with user info
  codeCache.set(authCode, {
    userId: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.email.split('@')[0],
    clientId: client_id,
    redirectUri: redirect_uri,
    scope: scope,
    nonce: nonce,
    state: state
  });

  // Redirect back to client with authorization code
  const redirectUrl = new URL(redirect_uri as string);
  redirectUrl.searchParams.set('code', authCode);
  if (state) redirectUrl.searchParams.set('state', state as string);

  res.redirect(redirectUrl.toString());
});

// Token Endpoint
app.post('/oauth/token', async (req, res) => {
  const { 
    grant_type, 
    code, 
    redirect_uri, 
    client_id, 
    client_secret 
  } = req.body;

  // Validate grant type
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  // Validate client
  const client = OAUTH_CLIENTS[client_id];
  if (!client || client.clientSecret !== client_secret) {
    return res.status(400).json({ error: 'invalid_client' });
  }

  // Validate authorization code
  const authData = codeCache.get(code);
  if (!authData) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  // Validate redirect URI
  if (authData.redirectUri !== redirect_uri) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  // Get user role
  const userRole = await getUserRole(authData.userId);

  // Generate access token (simplified)
  const accessToken = jwt.sign(
    { 
      sub: authData.userId,
      email: authData.email,
      name: authData.name,
      roles: [userRole],
      client_id: client_id
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Generate ID token
  const idToken = await new SignJWT({
    iss: JWT_ISSUER,
    sub: authData.userId,
    aud: client_id,
    email: authData.email,
    email_verified: true,
    name: authData.name,
    roles: [userRole],
    nonce: authData.nonce
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT_SECRET));

  // Clean up authorization code
  codeCache.del(code);

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    id_token: idToken,
    scope: authData.scope
  });
});

// UserInfo Endpoint
app.get('/oauth/userinfo', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    res.json({
      sub: decoded.sub,
      email: decoded.email,
      email_verified: true,
      name: decoded.name,
      roles: decoded.roles
    });
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'invalid_token' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'neptino-oauth-server' });
});

// Start server
app.listen(port, () => {
  console.log(`🔐 OAuth/OIDC Server running on port ${port}`);
  console.log(`📋 Discovery endpoint: http://localhost:${port}/.well-known/openid-configuration`);
  console.log(`🔑 Authorization endpoint: http://localhost:${port}/oauth/authorize`);
  console.log(`🎫 Token endpoint: http://localhost:${port}/oauth/token`);
  console.log(`👤 UserInfo endpoint: http://localhost:${port}/oauth/userinfo`);
});

export default app;
