const { createClient } = require('@supabase/supabase-js');

// Use service role to disable all restrictions
const supabase = createClient(
  'http://127.0.0.1:54321', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function disableAllRLS() {
  console.log('🔓 Disabling all RLS policies for testing...');
  
  const sqlCommands = [
    // Disable RLS on users table
    'ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;',
    
    // Drop all existing policies on users table
    'DROP POLICY IF EXISTS "Users can view own profile" ON public.users;',
    'DROP POLICY IF EXISTS "Users can update own profile" ON public.users;', 
    'DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;',
    'DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON public.users;',
    'DROP POLICY IF EXISTS "Allow users to view own profile" ON public.users;',
    'DROP POLICY IF EXISTS "Allow users to update own profile" ON public.users;',
    
    // Disable RLS on courses table if it exists
    'ALTER TABLE IF EXISTS public.courses DISABLE ROW LEVEL SECURITY;',
    
    // Drop all existing policies on courses table
    'DROP POLICY IF EXISTS "Teachers can view own courses" ON public.courses;',
    'DROP POLICY IF EXISTS "Teachers can insert courses" ON public.courses;',
    'DROP POLICY IF EXISTS "Teachers can update own courses" ON public.courses;',
    'DROP POLICY IF EXISTS "Teachers can delete own courses" ON public.courses;',
    'DROP POLICY IF EXISTS "Students can view enrolled courses" ON public.courses;',
    
    // Grant full permissions to anon and authenticated roles
    'GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;',
    'GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;',
    'GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;',
    'GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;',
  ];
  
  for (const sql of sqlCommands) {
    try {
      console.log(`Executing: ${sql}`);
      const { data, error } = await supabase.rpc('sql', { query: sql });
      
      if (error) {
        console.log(`⚠️  ${sql} - ${error.message}`);
      } else {
        console.log(`✅ ${sql}`);
      }
    } catch (err) {
      console.log(`⚠️  ${sql} - ${err.message}`);
    }
  }
  
  console.log('\n🧪 Testing access...');
  
  // Test if we can now access the users table
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .single();
      
    if (error) {
      console.error('❌ Still getting errors:', error);
    } else {
      console.log('✅ Can now access users table!');
    }
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

disableAllRLS().catch(console.error);
