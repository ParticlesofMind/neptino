const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54321', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

async function testImageUpload() {
  console.log('🧪 Testing image upload functionality...');
  
  // Check if storage bucket exists
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  console.log('Available buckets:', buckets?.map(b => b.name));
  
  if (bucketError) {
    console.error('❌ Bucket error:', bucketError);
    return;
  }
  
  const coursesBucket = buckets?.find(b => b.name === 'courses');
  if (!coursesBucket) {
    console.error('❌ Courses bucket not found');
    return;
  }
  
  console.log('✅ Courses bucket exists');
  
  // List files in bucket
  const { data: files, error: listError } = await supabase.storage
    .from('courses')
    .list();
    
  console.log('Files in bucket:', files);
  
  if (listError) {
    console.error('❌ List error:', listError);
  }
  
  // Test creating a simple file
  const testContent = new Blob(['test image content'], { type: 'text/plain' });
  const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
  
  const { error: uploadError } = await supabase.storage
    .from('courses')
    .upload('test-upload.txt', testFile);
    
  if (uploadError) {
    console.error('❌ Upload test failed:', uploadError);
  } else {
    console.log('✅ Upload test succeeded');
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('courses')
      .getPublicUrl('test-upload.txt');
      
    console.log('✅ Public URL:', publicUrl);
  }
}

testImageUpload().catch(console.error);
