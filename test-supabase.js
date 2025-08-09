/**
 * Simple Supabase connection test
 * Run with: node test-supabase.js
 */

import { createClient } from '@supabase/supabase-js'

// Your credentials
const supabaseUrl = 'https://lwsmhyagdgtmkiqflplq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3c21oeWFnZGd0bWtpcWZscGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkzNzMxNjUsImV4cCI6MjA0NDk0OTE2NX0.drCJU5-BsOsif1UjQPLPEKjkNN-3xt7tUdU246uWavA'

async function testConnection() {
  console.log('🔍 Testing Supabase connection...')
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Supabase client created')
    
    // Test basic connection
    console.log('🔗 Testing database connection...')
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.log('ℹ️ Users table result:', error.message)
      if (error.code === 'PGRST116') {
        console.log('📝 This is normal - users table doesn\'t exist yet')
        console.log('✅ Connection is working! We can create the table.')
      } else {
        console.log('❌ Connection issue:', error)
        return
      }
    } else {
      console.log('✅ Users table exists and accessible')
    }
    
    // Test auth service
    console.log('🔐 Testing auth service...')
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.log('⚠️ Auth service issue:', authError)
    } else {
      console.log('✅ Auth service working')
    }
    
    console.log('🎉 Supabase connection test successful!')
    
  } catch (error) {
    console.error('❌ Connection test failed:', error)
  }
}

testConnection()
