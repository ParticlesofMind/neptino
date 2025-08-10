// ==========================================================================
// COURSE CREATION & CRUD OPERATIONS
// ==========================================================================

import { supabase } from '../supabase';

// Course creation interface
export interface CourseCreationData {
  course_name: string;
  course_description: string;
  course_image?: File | null;
  // teacher_id will be auto-filled from auth
  // Other fields will have defaults or be added later
}

// Course validation rules
export interface CourseValidation {
  course_name: boolean;
  course_description: boolean;
  course_image: boolean;
}

// ==========================================================================
// VALIDATION
// ==========================================================================

export function validateCourseData(data: Partial<CourseCreationData>): CourseValidation {
  return {
    course_name: Boolean(data.course_name && data.course_name.trim().length >= 3),
    course_description: Boolean(data.course_description && data.course_description.trim().length >= 10),
    course_image: Boolean(data.course_image) // Course image is required
  };
}

export function isValidCourse(validation: CourseValidation): boolean {
  return Object.values(validation).every(isValid => isValid);
}

// ==========================================================================
// IMAGE UPLOAD
// ==========================================================================

export async function uploadCourseImage(file: File, courseId: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${courseId}/cover.${fileExt}`;
    const filePath = `course-images/${fileName}`;

    // Upload file to Supabase Storage
    const { error } = await supabase.storage
      .from('courses')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('courses')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadCourseImage:', error);
    return null;
  }
}

// ==========================================================================
// COURSE CRUD OPERATIONS
// ==========================================================================

export async function createCourse(data: CourseCreationData): Promise<{ success: boolean; courseId?: string; error?: string }> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Validate data
    const validation = validateCourseData(data);
    if (!isValidCourse(validation)) {
      return { success: false, error: 'Invalid course data' };
    }

    // Create course record with your actual schema
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .insert({
        course_name: data.course_name.trim(),
        course_description: data.course_description.trim(),
        teacher_id: user.id, // Use teacher_id from your schema
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        canvas_count: 1, // Default value
        lesson_days_count: 1 // Default value
      })
      .select('id')
      .single();

    if (courseError) {
      console.error('Error creating course:', courseError);
      return { success: false, error: 'Failed to create course' };
    }

    const courseId = courseData.id;

    // Upload image if provided
    if (data.course_image) {
      const imageUrl = await uploadCourseImage(data.course_image, courseId);
      if (imageUrl) {
        // Update course with image URL using course_image field
        await supabase
          .from('courses')
          .update({ course_image: imageUrl })
          .eq('id', courseId);
      }
    }

    return { success: true, courseId };
  } catch (error) {
    console.error('Error in createCourse:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export async function updateCourse(courseId: string, data: Partial<CourseCreationData>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('courses')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId);

    if (error) {
      console.error('Error updating course:', error);
      return { success: false, error: 'Failed to update course' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateCourse:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export async function deleteCourse(courseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('Error deleting course:', error);
      return { success: false, error: 'Failed to delete course' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteCourse:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export async function getCourse(courseId: string) {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) {
      console.error('Error fetching course:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getCourse:', error);
    return null;
  }
}

export async function getUserCourses(userId?: string) {
  try {
    let query = supabase.from('courses').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      // Get current user's courses
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return [];
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserCourses:', error);
    return [];
  }
}
