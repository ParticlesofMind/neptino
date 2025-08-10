const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function checkCourseData() {
  try {
    // Get the most recent course
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Most recent course data:');
    console.log('ID:', data.id);
    console.log('Name:', data.course_name);
    console.log('Language:', data.course_language);
    console.log('Image:', data.course_image);
    console.log('Description:', data.course_description);
    console.log('Created:', data.created_at);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCourseData();
