const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

async function testWithNewUser() {
  console.log('🧪 Testing with a fresh user...');
  
  // Create a test user
  const testEmail = `teacher-${Date.now()}@test.com`;
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'testpass123',
    options: {
      data: {
        first_name: 'Test',
        last_name: 'Teacher',
        user_role: 'teacher'
      }
    }
  });

  if (signupError) {
    console.error('❌ Signup failed:', signupError);
    return;
  }

  console.log('✅ User created:', signupData.user?.id);

  // Wait a moment for trigger
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test getting user data
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', signupData.user?.id);

  if (userError) {
    console.error('❌ User fetch failed:', userError);
  } else {
    console.log('✅ User data:', userData);
  }

  // Test creating a course
  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .insert({
      course_name: 'Test Course',
      course_description: 'A test course',
      teacher_id: signupData.user?.id,
      institution: 'Test University',
      course_language: 'English'
    })
    .select()
    .single();

  if (courseError) {
    console.error('❌ Course creation failed:', courseError);
  } else {
    console.log('✅ Course created:', courseData);
  }

  return signupData.user?.id;
}

testWithNewUser().catch(console.error);
