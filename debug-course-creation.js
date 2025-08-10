import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkForDuplicateCourses() {
  try {
    // Get all courses
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching courses:', error)
      return
    }

    console.log('\n=== ALL COURSES ===')
    courses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.course_name} (ID: ${course.id})`)
      console.log(`   Teacher ID: ${course.teacher_id}`)
      console.log(`   Created: ${course.created_at}`)
      console.log(`   Updated: ${course.updated_at}`)
      console.log('')
    })

    // Check for potential duplicates
    const duplicates = courses.filter((course, index, array) => 
      array.findIndex(c => 
        c.course_name === course.course_name && 
        c.teacher_id === course.teacher_id &&
        c.id !== course.id
      ) !== -1
    )

    if (duplicates.length > 0) {
      console.log('\n⚠️  POTENTIAL DUPLICATES FOUND:')
      duplicates.forEach(course => {
        console.log(`- ${course.course_name} (ID: ${course.id}, Teacher: ${course.teacher_id})`)
      })
    } else {
      console.log('\n✅ No obvious duplicates found based on name and teacher')
    }

    // Group by creation time (within 1 second)
    const timeGroups = {}
    courses.forEach(course => {
      const timeKey = course.created_at.substring(0, 19) // Remove milliseconds
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = []
      }
      timeGroups[timeKey].push(course)
    })

    const suspiciousTimeGroups = Object.entries(timeGroups).filter(([time, courses]) => courses.length > 1)
    
    if (suspiciousTimeGroups.length > 0) {
      console.log('\n⚠️  COURSES CREATED AT SAME TIME:')
      suspiciousTimeGroups.forEach(([time, courses]) => {
        console.log(`\nTime: ${time}`)
        courses.forEach(course => {
          console.log(`  - ${course.course_name} (ID: ${course.id})`)
        })
      })
    } else {
      console.log('\n✅ No courses created at suspiciously similar times')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

// Run the check
checkForDuplicateCourses()
