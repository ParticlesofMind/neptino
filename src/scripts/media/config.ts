export const CONFIG = {
  environment: (import.meta as any).env?.MODE || 'development',
  development: {
    freesound: {
      apiKey: (import.meta as any).env?.VITE_FREESOUND_KEY || 'YOUR_FREESOUND_API_KEY',
      baseUrl: 'https://freesound.org/apiv2',
      rateLimitPerMinute: 10,
    },
    unsplash: {
      apiKey: (import.meta as any).env?.VITE_UNSPLASH_KEY || 'YOUR_UNSPLASH_API_KEY',
      baseUrl: 'https://api.unsplash.com',
      rateLimitPerMinute: 50,
    },
    pixabay: {
      apiKey: (import.meta as any).env?.VITE_PIXABAY_KEY || 'YOUR_PIXABAY_KEY',
      baseUrl: 'https://pixabay.com',
      rateLimitPerMinute: 60,
    },
    pexels: {
      apiKey: (import.meta as any).env?.VITE_PEXELS_KEY || 'YOUR_PEXELS_KEY',
      baseUrl: 'https://api.pexels.com',
      rateLimitPerMinute: 200,
    },
    googleDrive: {
      apiKey: (import.meta as any).env?.VITE_GOOGLE_DRIVE_KEY, // optional
      clientId: (import.meta as any).env?.VITE_GOOGLE_DRIVE_CLIENT_ID,
      redirectUri: (import.meta as any).env?.VITE_OAUTH_REDIRECT,
      baseUrl: 'https://www.googleapis.com',
      rateLimitPerMinute: 60,
    },
    dropbox: {
      apiKey: (import.meta as any).env?.VITE_DROPBOX_KEY,
      clientId: (import.meta as any).env?.VITE_DROPBOX_CLIENT_ID,
      redirectUri: (import.meta as any).env?.VITE_OAUTH_REDIRECT,
      baseUrl: 'https://api.dropboxapi.com',
      rateLimitPerMinute: 60,
    },
  },
  production: {
    freesound: {
      apiKey: (import.meta as any).env?.VITE_FREESOUND_KEY || (window as any).FREESOUND_KEY || '',
      baseUrl: 'https://freesound.org/apiv2',
      rateLimitPerMinute: 100,
    },
    unsplash: {
      apiKey: (import.meta as any).env?.VITE_UNSPLASH_KEY || (window as any).UNSPLASH_KEY || '',
      baseUrl: 'https://api.unsplash.com',
      rateLimitPerMinute: 1000,
    },
    pixabay: {
      apiKey: (import.meta as any).env?.VITE_PIXABAY_KEY || (window as any).PIXABAY_KEY || '',
      baseUrl: 'https://pixabay.com',
      rateLimitPerMinute: 120,
    },
    pexels: {
      apiKey: (import.meta as any).env?.VITE_PEXELS_KEY || (window as any).PEXELS_KEY || '',
      baseUrl: 'https://api.pexels.com',
      rateLimitPerMinute: 200,
    },
    googleDrive: {
      apiKey: (import.meta as any).env?.VITE_GOOGLE_DRIVE_KEY || (window as any).GOOGLE_DRIVE_KEY,
      clientId: (import.meta as any).env?.VITE_GOOGLE_DRIVE_CLIENT_ID || (window as any).GOOGLE_DRIVE_CLIENT_ID,
      redirectUri: (import.meta as any).env?.VITE_OAUTH_REDIRECT || (window as any).OAUTH_REDIRECT,
      baseUrl: 'https://www.googleapis.com',
      rateLimitPerMinute: 120,
    },
    dropbox: {
      apiKey: (import.meta as any).env?.VITE_DROPBOX_KEY || (window as any).DROPBOX_KEY,
      clientId: (import.meta as any).env?.VITE_DROPBOX_CLIENT_ID || (window as any).DROPBOX_CLIENT_ID,
      redirectUri: (import.meta as any).env?.VITE_OAUTH_REDIRECT || (window as any).OAUTH_REDIRECT,
      baseUrl: 'https://api.dropboxapi.com',
      rateLimitPerMinute: 120,
    },
  },
} as const;

export function resolveConfig() {
  const env = (import.meta as any).env?.MODE || 'development';
  return env === 'production' ? CONFIG.production : CONFIG.development;
}
