import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

let lastCourseCount = 0;

async function monitorCourseCreation() {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching courses:', error)
      return
    }

    const currentCount = courses.length;
    
    if (currentCount !== lastCourseCount) {
      console.log(`\n📊 Course count changed: ${lastCourseCount} → ${currentCount}`)
      
      if (currentCount > lastCourseCount) {
        const newCourses = courses.slice(0, currentCount - lastCourseCount);
        console.log('🆕 New courses detected:')
        newCourses.forEach(course => {
          console.log(`  - ${course.course_name} (ID: ${course.id})`)
          console.log(`    Teacher: ${course.teacher_id}`)
          console.log(`    Created: ${course.created_at}`)
        })
        
        // Check for duplicates in the new courses
        const duplicateCheck = newCourses.filter((course, index, array) => 
          array.findIndex(c => 
            c.course_name === course.course_name && 
            c.teacher_id === course.teacher_id &&
            c.id !== course.id
          ) !== -1
        )
        
        if (duplicateCheck.length > 0) {
          console.log('❌ DUPLICATE DETECTED!')
          duplicateCheck.forEach(dup => {
            console.log(`  ⚠️  ${dup.course_name} appears to be a duplicate`)
          })
        } else {
          console.log('✅ No duplicates in new courses')
        }
      }
      
      lastCourseCount = currentCount;
    }
    
  } catch (error) {
    console.error('Monitor error:', error)
  }
}

console.log('🔍 Starting course creation monitor...')
console.log('📝 Navigate to http://localhost:3000/src/pages/teacher/coursebuilder.html and try creating a course')

// Initial check
monitorCourseCreation()

// Monitor every 2 seconds
setInterval(monitorCourseCreation, 2000)
