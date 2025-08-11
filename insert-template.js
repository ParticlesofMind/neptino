// Quick script to insert the "english lesson" template into the database
// Run this in the browser console when on the coursebuilder page

async function insertEnglishLessonTemplate() {
  console.log('📄 Inserting English Lesson template...');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return;
    }
    
    // Get current course ID
    const courseId = sessionStorage.getItem('currentCourseId');
    if (!courseId) {
      console.error('No current course ID found');
      return;
    }
    
    const templateData = {
      name: "english lesson",
      blocks: [
        {
          id: "header-1",
          type: "header",
          order: 1,
          config: {
            course_title: true,
            lesson_title: true,
            module_title: true,
            teacher_name: true,
            lesson_number: true,
            institution_name: true
          },
          content: "<div class=\"header-section\">{{header}}</div>"
        },
        {
          id: "program-1",
          type: "program",
          order: 2,
          config: {
            task: true,
            topic: true,
            objective: true,
            competence: true
          },
          content: "<div class=\"program-section\">{{program}}</div>"
        },
        {
          id: "resources-1",
          type: "resources",
          order: 3,
          config: {
            task: true,
            type: true,
            state: true,
            origin: true,
            quality: true,
            concepts: true,
            terminology: true,
            include_glossary: true,
            historical_figures: true
          },
          content: "<div class=\"resources-section\">{{resources}}</div>"
        },
        {
          id: "content-1",
          type: "content",
          order: 4,
          config: {
            student_area: true,
            teacher_area: true,
            student_title: true,
            teacher_title: true,
            instruction_area: true,
            instruction_title: true
          },
          content: "<div class=\"content-section\">{{content}}</div>"
        },
        {
          id: "assignment-1",
          type: "assignment",
          order: 5,
          config: {
            student_area: true,
            teacher_area: true,
            student_title: true,
            teacher_title: true,
            instruction_area: true,
            instruction_title: true
          },
          content: "<div class=\"assignment-section\">{{assignment}}</div>"
        },
        {
          id: "footer-1",
          type: "footer",
          order: 6,
          config: {
            copyright: true,
            page_number: true,
            teacher_name: true,
            institution_name: true
          },
          content: "<footer class=\"template-footer\">{{footer}}</footer>"
        }
      ],
      settings: {
        version: "1.0",
        created_at: "2025-08-10T06:36:51.490Z"
      }
    };
    
    // Insert the template
    const { data, error } = await supabase
      .from('templates')
      .insert([{
        template_id: 'english-lesson-template',
        course_id: courseId,
        template_type: 'lesson',
        template_description: 'English lesson template with comprehensive fields',
        template_data: templateData,
        created_by: user.id
      }])
      .select()
      .single();
      
    if (error) {
      console.error('Error inserting template:', error);
      return;
    }
    
    console.log('✅ English Lesson template inserted successfully:', data);
    console.log('📄 Template ID:', data.id);
    console.log('📄 Template data:', data.template_data);
    
    // Refresh the page to load the new template
    console.log('🔄 Refreshing page to load new template...');
    window.location.reload();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Make function available globally
window.insertEnglishLessonTemplate = insertEnglishLessonTemplate;

console.log('📄 Template insertion script loaded. Run insertEnglishLessonTemplate() to insert the template.');
