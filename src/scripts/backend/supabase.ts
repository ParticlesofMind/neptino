/**
 * Supabase Client Configuration
 * Backend configuration for database and authentication services
 * Production-optimized for Supabase Pro
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file.",
  );
}

// Production-optimized Supabase client configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  db: {
    schema: "public",
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
  global: {
    headers: {
      "x-application-name": "neptino",
    },
  },
  // Realtime configuration (optional - enable if using subscriptions)
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
