/**
 * Diagnostic script to check students data in the database
 * Run with: node --input-type=module scripts/check_students_data.js
 * OR: npx tsx scripts/check_students_data.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudentsData() {
  console.log('🔍 Checking students data in database...\n');

  // Check all courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, course_name')
    .limit(10);

  if (coursesError) {
    console.error('❌ Error fetching courses:', coursesError);
    return;
  }

  console.log(`📚 Found ${courses?.length || 0} courses`);
  if (courses && courses.length > 0) {
    console.log('Courses:');
    courses.forEach(c => console.log(`  - ${c.course_name} (${c.id})`));
  }

  // Check all enrollments
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select('id, course_id, student_id, metadata')
    .limit(100);

  if (enrollmentsError) {
    console.error('❌ Error fetching enrollments:', enrollmentsError);
    return;
  }

  console.log(`\n👥 Found ${enrollments?.length || 0} total enrollments`);

  if (enrollments && enrollments.length > 0) {
    // Group by course
    const byCourse = {};
    enrollments.forEach(e => {
      const courseId = e.course_id;
      if (!byCourse[courseId]) {
        byCourse[courseId] = [];
      }
      byCourse[courseId].push(e);
    });

    console.log('\nEnrollments by course:');
    for (const [courseId, enrolls] of Object.entries(byCourse)) {
      const course = courses?.find(c => c.id === courseId);
      console.log(`  ${course?.course_name || courseId}: ${enrolls.length} students`);
      
      // Show sample student
      if (enrolls.length > 0) {
        const sample = enrolls[0];
        const meta = sample.metadata || {};
        console.log(`    Sample: ${meta.first_name} ${meta.last_name} (${meta.email || 'no email'})`);
      }
    }
  } else {
    console.log('\n⚠️  No enrollments found in database!');
    console.log('   This means:');
    console.log('   1. Students were not migrated from the old students table');
    console.log('   2. OR students were never uploaded');
    console.log('   3. OR students were uploaded but not saved properly');
    console.log('\n   Solution: Re-upload your students using the students upload feature.');
  }

  // Check specific course
  const targetCourseId = '3b6a216a-3f4c-45bc-953c-68cb0003a18d';
  console.log(`\n🎯 Checking target course: ${targetCourseId}`);
  
  const { data: targetEnrollments, error: targetError } = await supabase
    .from('enrollments')
    .select('id, student_id, metadata')
    .eq('course_id', targetCourseId);

  if (targetError) {
    console.error('❌ Error:', targetError);
  } else {
    console.log(`   Found ${targetEnrollments?.length || 0} enrollments for this course`);
    if (targetEnrollments && targetEnrollments.length > 0) {
      targetEnrollments.forEach(e => {
        const meta = e.metadata || {};
        console.log(`   - ${meta.first_name} ${meta.last_name}`);
      });
    }
  }
}

checkStudentsData().catch(console.error);

