/**
 * Check existing users table structure
 */

import { supabase } from './src/ts/supabase.js'

async function checkUsersTable() {
  console.log('🔍 Checking existing users table structure...')
  
  try {
    // Try to get one user to see the structure
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ Error accessing users table:', error.message)
      console.log('Error code:', error.code)
      return
    }
    
    if (data && data.length > 0) {
      console.log('✅ Users table exists with structure:')
      console.log('📊 Columns:', Object.keys(data[0]))
      console.log('📝 Sample data (anonymized):', {
        ...data[0],
        email: '[EMAIL_HIDDEN]',
        password: '[PASSWORD_HIDDEN]'
      })
    } else {
      console.log('📊 Users table exists but is empty')
    }
    
    // Also check courses table
    console.log('\n🔍 Checking courses table...')
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .limit(1)
    
    if (coursesError) {
      console.log('❌ Error accessing courses table:', coursesError.message)
    } else {
      if (coursesData && coursesData.length > 0) {
        console.log('✅ Courses table structure:', Object.keys(coursesData[0]))
      } else {
        console.log('📊 Courses table exists but is empty')
      }
    }
    
    // Check lesson_templates table
    console.log('\n🔍 Checking lesson_templates table...')
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lesson_templates')
      .select('*')
      .limit(1)
    
    if (lessonsError) {
      console.log('❌ Error accessing lesson_templates table:', lessonsError.message)
    } else {
      if (lessonsData && lessonsData.length > 0) {
        console.log('✅ Lesson templates table structure:', Object.keys(lessonsData[0]))
      } else {
        console.log('📊 Lesson templates table exists but is empty')
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error)
  }
}

// Run when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkUsersTable, 3000)
})
