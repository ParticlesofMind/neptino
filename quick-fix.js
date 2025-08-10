const { createClient } = require('@supabase/supabase-js');

// Use service role to execute SQL directly
const supabase = createClient(
  'http://127.0.0.1:54321', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function executeSQL(sql) {
  console.log(`🔧 Executing: ${sql}`);
  
  try {
    // For simple queries, we can use the REST API directly
    const response = await fetch('http://127.0.0.1:54321/rest/v1/rpc/exec_sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
      },
      body: JSON.stringify({ sql })
    });

    if (response.ok) {
      const result = await response.text();
      console.log('✅ Success:', result);
      return true;
    } else {
      console.log('❌ HTTP Error:', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

async function quickFixes() {
  console.log('🚀 Applying quick fixes without database reset...');
  
  // Remove the .keep file if it exists
  console.log('\n1. Cleaning up storage...');
  try {
    const { error } = await supabase.storage
      .from('courses')
      .remove(['.keep']);
    
    if (error && !error.message.includes('not found')) {
      console.log('⚠️  Storage cleanup:', error.message);
    } else {
      console.log('✅ Cleaned up .keep file');
    }
  } catch (err) {
    console.log('⚠️  Storage cleanup error:', err.message);
  }
  
  // Check if storage bucket exists and is public
  console.log('\n2. Verifying storage bucket...');
  const { data: buckets } = await supabase.storage.listBuckets();
  const coursesBucket = buckets?.find(b => b.name === 'courses');
  
  if (coursesBucket) {
    console.log('✅ Courses bucket exists and is public:', coursesBucket.public);
  } else {
    console.log('❌ Courses bucket missing');
  }
  
  // Test current permissions
  console.log('\n3. Testing current permissions...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .single();
    
    if (error) {
      console.log('❌ Users table access:', error.message);
    } else {
      console.log('✅ Users table accessible');
    }
  } catch (err) {
    console.log('❌ Users table test failed:', err.message);
  }
  
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('count(*)')
      .single();
    
    if (error) {
      console.log('❌ Courses table access:', error.message);
    } else {
      console.log('✅ Courses table accessible');
    }
  } catch (err) {
    console.log('❌ Courses table test failed:', err.message);
  }
  
  console.log('\n🎉 Quick fixes applied! No database reset needed.');
}

// Run the quick fixes
quickFixes().catch(console.error);
