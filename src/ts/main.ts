/**
 * Neptino Educational Platform
 * Main TypeScript entry point
 */

import { supabase } from './supabase'
import './features/auth/form-handler' // Initialize form handlers

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Neptino Educational Platform - Loading...');
  
  // Test Supabase connection first
  testSupabaseConnection();
  
  // Initialize app components
  initializeApp();
});

/**
 * Test Supabase connection and configuration
 */
async function testSupabaseConnection(): Promise<void> {
  console.log('🔍 Testing Supabase connection...');

  try {
    // Test 1: Check environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseKey?.length || 0
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing environment variables');
      console.log('📝 Please create a .env file with:');
      console.log('VITE_SUPABASE_URL=your_supabase_project_url');
      console.log('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
      return;
    }

    console.log('✅ Environment variables found');

    // Test 2: Test basic connection
    console.log('🔗 Testing database connection...');
    const { error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Database connection failed:', error);
      console.log('💡 This might mean:');
      console.log('   - Your Supabase project is not set up');
      console.log('   - The users table does not exist');
      console.log('   - Your API keys are incorrect');
      return;
    }

    console.log('✅ Database connection successful');

    // Test 3: Test authentication service
    console.log('🔐 Testing auth service...');
    const { data: authData, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.warn('⚠️ Auth service issue:', authError);
    } else {
      console.log('✅ Auth service accessible', {
        hasSession: !!authData.session
      });
    }

    console.log('🎉 Supabase connection test completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error during connection test:', error);
    console.log('🔧 Please check your Supabase configuration');
  }
}

/**
 * Initialize the main application
 */
async function initializeApp(): Promise<void> {
  console.log('🔗 Connecting to Supabase...');
  
  try {
    // Test Supabase connection
    const { error } = await supabase.from('users').select('count').limit(1)
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
      console.warn('⚠️ Supabase connection issue:', error.message)
      console.log('📋 Please set up your database schema first')
    } else {
      console.log('✅ Supabase connected successfully')
    }
  } catch (error) {
    console.warn('⚠️ Supabase connection failed:', error)
    console.log('🔧 Please check your .env configuration')
  }
  
  console.log('✅ Neptino Educational Platform - Ready!');
}
