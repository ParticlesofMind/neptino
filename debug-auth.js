// Quick test to debug the auth connection issue
console.log('🔍 Testing direct Supabase auth call...')

fetch('http://127.0.0.1:54321/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  },
  body: JSON.stringify({
    email: 'edutainer96@gmail.com',
    password: 'test123' // try a simple password
  })
})
.then(response => {
  console.log('✅ Response status:', response.status)
  return response.json()
})
.then(data => {
  console.log('✅ Response data:', data)
})
.catch(error => {
  console.error('❌ Fetch error:', error)
})
