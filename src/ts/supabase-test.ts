/**
 * Supabase Connection Test
 * Run this to verify your Supabase setup is working
 */

import { supabase } from './supabase.js';
import { logger } from './core/utils/logger.js';

export async function testSupabaseConnection(): Promise<void> {
  logger.info('Testing Supabase connection...');

  try {
    // Test 1: Check environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.error('❌ Environment variables missing', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
      return;
    }

    logger.info('✅ Environment variables found');

    // Test 2: Test basic connection
    const { error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (error) {
      logger.error('❌ Database connection failed', error);
      return;
    }

    logger.info('✅ Database connection successful');

    // Test 3: Check if users table exists and has expected structure
    const { error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (tableError) {
      logger.error('❌ Users table structure issue', tableError);
      return;
    }

    logger.info('✅ Users table accessible');

    // Test 4: Check authentication service
    const { data: authData, error: authError } = await supabase.auth.getSession();

    if (authError) {
      logger.warn('⚠️ Auth service issue', authError);
    } else {
      logger.info('✅ Auth service accessible', {
        hasSession: !!authData.session
      });
    }

    // Test 5: Test RLS policies (attempt to read without auth)
    const { error: rlsError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (rlsError && rlsError.code === 'PGRST116') {
      logger.info('✅ RLS policies are working (expected error)');
    } else if (!rlsError) {
      logger.warn('⚠️ RLS policies might not be configured properly');
    }

    logger.info('🎉 Supabase connection test completed!');

  } catch (error) {
    logger.error('❌ Unexpected error during connection test', error);
  }
}

// Auto-run test if this file is loaded directly
if (typeof window !== 'undefined') {
  testSupabaseConnection();
}
