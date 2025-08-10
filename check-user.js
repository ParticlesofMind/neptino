import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseService = createClient(supabaseUrl, serviceRoleKey);

async function createTestUserAndProfile() {
  try {
    console.log('Creating a test user...');
    
    // First, create a user in auth.users
    const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
      email: 'testteacher@example.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Teacher',
        user_role: 'teacher'
      }
    });
    
    console.log('Auth user creation result:', authData);
    console.log('Auth user creation error:', authError);
    
    if (authData?.user) {
      console.log('✅ Auth user created with ID:', authData.user.id);
      
      // Now create the profile in public.users
      const { data: profileData, error: profileError } = await supabaseService
        .from('users')
        .insert({
          id: authData.user.id,
          first_name: 'Test',
          last_name: 'Teacher',
          email: 'testteacher@example.com',
          role: 'teacher',
          institution: 'Independent'
        });
      
      console.log('Profile creation result:', profileData);
      console.log('Profile creation error:', profileError);
      
      if (!profileError) {
        console.log('✅ User profile created successfully!');
        
        // Test course creation with this user
        console.log('\nTesting course creation...');
        
        // Sign in as this user first
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'testteacher@example.com',
          password: 'password123'
        });
        
        console.log('Sign in result:', signInData);
        console.log('Sign in error:', signInError);
        
        if (signInData?.user) {
          console.log('✅ Signed in successfully');
          
          // Try to create a course
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .insert({
              course_name: 'Test Course',
              course_description: 'This is a test course',
              teacher_id: signInData.user.id,
              canvas_count: 1,
              lesson_days_count: 1
            })
            .select('id')
            .single();
          
          console.log('Course creation result:', courseData);
          console.log('Course creation error:', courseError);
          
          if (!courseError) {
            console.log('🎉 Course created successfully!');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestUserAndProfile();

createTestUserAndProfile();
