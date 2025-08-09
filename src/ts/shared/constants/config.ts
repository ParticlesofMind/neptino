/**
 * Application configuration constants
 */

export const APP_CONFIG = {
  NAME: 'Neptino',
  VERSION: '1.0.0',
  DESCRIPTION: 'Educational Platform for Seamless Learning',
  
  // Session configuration
  SESSION_TIMEOUT: 60 * 60 * 24 * 7, // 7 days in seconds
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPT_WINDOW: 15 * 60 * 1000, // 15 minutes in milliseconds
  
  // UI configuration
  TOAST_DURATION: 5000, // 5 seconds
  
  // Local storage keys
  STORAGE_KEYS: {
    USER_SESSION: 'neptino_session',
    USER_PREFERENCES: 'neptino_preferences',
    SECURITY_LOGS: 'neptino_security_logs',
    LOGIN_ATTEMPTS: 'neptino_login_attempts'
  }
} as const;

export const ENVIRONMENT = {
  DEVELOPMENT: import.meta.env.DEV,
  PRODUCTION: import.meta.env.PROD,
  API_URL: import.meta.env.VITE_API_URL || '',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
} as const;
