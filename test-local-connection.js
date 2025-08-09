// Quick test to verify local Supabase connection
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Testing local Supabase connection...')
console.log('Supabase URL:', supabaseUrl)
console.log('Anon Key:', supabaseKey.substring(0, 20) + '...')

// Test connection
supabase.from('users').select('count', { count: 'exact' })
  .then(({ data, error, count }) => {
    if (error) {
      console.error('❌ Connection failed:', error)
    } else {
      console.log('✅ Connected to local Supabase!')
      console.log('Users table count:', count)
    }
  })
  .catch(console.error)
