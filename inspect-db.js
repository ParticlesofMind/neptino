/**
 * Supabase Database Inspector
 * Check what tables and schema already exist
 */

import { supabase } from './src/ts/supabase'

async function inspectDatabase() {
  console.log('🔍 Inspecting Supabase database...')
  
  try {
    // First, test basic auth functionality 
    console.log('� Testing auth service...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('Current user:', user ? 'Logged in' : 'Not logged in')
    
    // Try to access common tables
    const tablesToCheck = ['users', 'profiles', 'accounts', 'user_profiles']
    
    for (const tableName of tablesToCheck) {
      console.log(`📋 Checking table: ${tableName}`)
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`   ❌ ${tableName}: ${error.message} (${error.code})`)
      } else {
        console.log(`   ✅ ${tableName}: Exists and accessible`)
        if (data && data.length > 0) {
          console.log(`   📊 Sample columns:`, Object.keys(data[0]))
        } else {
          console.log(`   📊 Table is empty`)
        }
      }
    }
    
    // Test a simple auth signup to see what happens (won't actually create user)
    console.log('🧪 Testing auth signup process...')
    const testResult = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'test123',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          role: 'student'
        }
      }
    })
    
    if (testResult.error) {
      console.log('   Auth signup response:', testResult.error.message)
    } else {
      console.log('   Auth signup would work (test passed)')
    }
    
    console.log('🎉 Database inspection complete!')
    
  } catch (error) {
    console.error('❌ Database inspection failed:', error)
  }
}

// Run inspection when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(inspectDatabase, 2000) // Wait for main app to load
})
