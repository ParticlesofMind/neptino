// Type-safe environment variable access
interface ImportMetaEnv {
  readonly MODE?: string;
  readonly VITE_FREESOUND_KEY?: string;
  readonly VITE_UNSPLASH_KEY?: string;
  readonly VITE_PIXABAY_KEY?: string;
  readonly VITE_PEXELS_KEY?: string;
  readonly VITE_GOOGLE_DRIVE_KEY?: string;
  readonly VITE_GOOGLE_DRIVE_CLIENT_ID?: string;
  readonly VITE_DROPBOX_KEY?: string;
  readonly VITE_DROPBOX_CLIENT_ID?: string;
  readonly VITE_OAUTH_REDIRECT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Type-safe window extensions
interface WindowWithKeys extends Window {
  FREESOUND_KEY?: string;
  UNSPLASH_KEY?: string;
  PIXABAY_KEY?: string;
  PEXELS_KEY?: string;
  GOOGLE_DRIVE_KEY?: string;
  GOOGLE_DRIVE_CLIENT_ID?: string;
  DROPBOX_KEY?: string;
  DROPBOX_CLIENT_ID?: string;
  OAUTH_REDIRECT?: string;
}

const env = (import.meta as ImportMeta).env;
const win = window as WindowWithKeys;

export const CONFIG = {
  environment: env?.MODE || 'development',
  development: {
    freesound: {
      apiKey: env?.VITE_FREESOUND_KEY || 'YOUR_FREESOUND_API_KEY',
      baseUrl: 'https://freesound.org/apiv2',
      rateLimitPerMinute: 10,
    },
    unsplash: {
      apiKey: env?.VITE_UNSPLASH_KEY || 'YOUR_UNSPLASH_API_KEY',
      baseUrl: 'https://api.unsplash.com',
      rateLimitPerMinute: 50,
    },
    pixabay: {
      apiKey: env?.VITE_PIXABAY_KEY || 'YOUR_PIXABAY_KEY',
      baseUrl: 'https://pixabay.com',
      rateLimitPerMinute: 60,
    },
    pexels: {
      apiKey: env?.VITE_PEXELS_KEY || 'YOUR_PEXELS_KEY',
      baseUrl: 'https://api.pexels.com',
      rateLimitPerMinute: 200,
    },
    googleDrive: {
      apiKey: env?.VITE_GOOGLE_DRIVE_KEY, // optional
      clientId: env?.VITE_GOOGLE_DRIVE_CLIENT_ID,
      redirectUri: env?.VITE_OAUTH_REDIRECT,
      baseUrl: 'https://www.googleapis.com',
      rateLimitPerMinute: 60,
    },
    dropbox: {
      apiKey: env?.VITE_DROPBOX_KEY,
      clientId: env?.VITE_DROPBOX_CLIENT_ID,
      redirectUri: env?.VITE_OAUTH_REDIRECT,
      baseUrl: 'https://api.dropboxapi.com',
      rateLimitPerMinute: 60,
    },
  },
  production: {
    freesound: {
      apiKey: env?.VITE_FREESOUND_KEY || win.FREESOUND_KEY || '',
      baseUrl: 'https://freesound.org/apiv2',
      rateLimitPerMinute: 100,
    },
    unsplash: {
      apiKey: env?.VITE_UNSPLASH_KEY || win.UNSPLASH_KEY || '',
      baseUrl: 'https://api.unsplash.com',
      rateLimitPerMinute: 1000,
    },
    pixabay: {
      apiKey: env?.VITE_PIXABAY_KEY || win.PIXABAY_KEY || '',
      baseUrl: 'https://pixabay.com',
      rateLimitPerMinute: 120,
    },
    pexels: {
      apiKey: env?.VITE_PEXELS_KEY || win.PEXELS_KEY || '',
      baseUrl: 'https://api.pexels.com',
      rateLimitPerMinute: 200,
    },
    googleDrive: {
      apiKey: env?.VITE_GOOGLE_DRIVE_KEY || win.GOOGLE_DRIVE_KEY,
      clientId: env?.VITE_GOOGLE_DRIVE_CLIENT_ID || win.GOOGLE_DRIVE_CLIENT_ID,
      redirectUri: env?.VITE_OAUTH_REDIRECT || win.OAUTH_REDIRECT,
      baseUrl: 'https://www.googleapis.com',
      rateLimitPerMinute: 120,
    },
    dropbox: {
      apiKey: env?.VITE_DROPBOX_KEY || win.DROPBOX_KEY,
      clientId: env?.VITE_DROPBOX_CLIENT_ID || win.DROPBOX_CLIENT_ID,
      redirectUri: env?.VITE_OAUTH_REDIRECT || win.OAUTH_REDIRECT,
      baseUrl: 'https://api.dropboxapi.com',
      rateLimitPerMinute: 120,
    },
  },
} as const;

export function resolveConfig() {
  const env = (import.meta as any).env?.MODE || 'development';
  return env === 'production' ? CONFIG.production : CONFIG.development;
}
