const { createClient } = require('@supabase/supabase-js');

// Use service role to create bucket properly
const supabase = createClient(
  'http://127.0.0.1:54321', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function fixStorage() {
  console.log('🔧 Fixing storage setup...');
  
  // Create the bucket
  console.log('Creating courses bucket...');
  const { data: createData, error: createError } = await supabase.storage.createBucket('courses', {
    public: true,
    allowedMimeTypes: ['image/*'],
    fileSizeLimit: 5242880 // 5MB
  });
  
  if (createError && !createError.message.includes('already exists')) {
    console.error('❌ Create bucket error:', createError);
  } else {
    console.log('✅ Courses bucket created/exists');
  }
  
  // List buckets to verify
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('❌ List buckets error:', listError);
  } else {
    console.log('📁 Available buckets:', buckets.map(b => `${b.name} (public: ${b.public})`));
  }
  
  // Test upload
  console.log('\n🧪 Testing upload...');
  const testContent = new Blob(['test image content'], { type: 'text/plain' });
  const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('courses')
    .upload('test-upload.txt', testFile, { upsert: true });
    
  if (uploadError) {
    console.error('❌ Upload test failed:', uploadError);
  } else {
    console.log('✅ Upload test succeeded:', uploadData);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('courses')
      .getPublicUrl('test-upload.txt');
      
    console.log('🔗 Public URL:', publicUrl);
  }
}

fixStorage().catch(console.error);
