import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixes() {
  try {
    console.log('🧪 Testing the fixes...');
    
    // Test 1: Check if RPC function exists and works
    console.log('\n1. Testing RPC function...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('ensure_user_profile', {
      user_id: '4c277c6a-ed35-440f-92d2-86e7ec67e633', // The user from your error
      user_email: 'test@example.com',
      user_role: 'teacher'
    });
    
    console.log('RPC result:', rpcData);
    console.log('RPC error:', rpcError);
    
    if (!rpcError) {
      console.log('✅ RPC function is working!');
    } else {
      console.log('❌ RPC function still has issues:', rpcError.message);
    }
    
    // Test 2: Check if user profile was created/exists
    console.log('\n2. Checking user profile...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', '4c277c6a-ed35-440f-92d2-86e7ec67e633');
    
    console.log('User data:', userData);
    console.log('User error:', userError);
    
    // Test 3: Check storage buckets
    console.log('\n3. Testing storage bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    console.log('Available buckets:', buckets?.map(b => b.name));
    console.log('Bucket error:', bucketError);
    
    const coursesBucket = buckets?.find(b => b.name === 'courses');
    if (coursesBucket) {
      console.log('✅ Courses storage bucket exists!');
    } else {
      console.log('❌ Courses storage bucket missing');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testFixes();

testFixes();
