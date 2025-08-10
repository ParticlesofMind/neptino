// ==========================================================================
// COURSE CREATION & CRUD OPERATIONS
// ==========================================================================

import { supabase } from '../supabase';

// Course creation interface
export interface CourseCreationData {
  course_name: string;
  course_description: string;
  course_language: string;
  course_image?: File | null;
  // teacher_id will be auto-filled from auth
  // Other fields will have defaults or be added later
}

// Course validation rules
export interface CourseValidation {
  course_name: boolean;
  course_description: boolean;
  course_language: boolean;
  course_image: boolean;
}

// ==========================================================================
// VALIDATION
// ==========================================================================

export function validateCourseData(data: Partial<CourseCreationData>): CourseValidation {
  return {
    course_name: Boolean(data.course_name && data.course_name.trim().length >= 3),
    course_description: Boolean(data.course_description && data.course_description.trim().length >= 10),
    course_language: Boolean(data.course_language && data.course_language.trim()),
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
    // Enhanced authentication check with session validation
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      return { success: false, error: 'Authentication session error' };
    }

    if (!session?.user) {
      console.error('No valid session or user found');
      return { success: false, error: 'User not authenticated - please sign in again' };
    }

    const user = session.user;
    console.log('Creating course for user:', user.id);

    // Ensure user profile exists in users table
    await ensureUserProfile(user);

    // Validate data
    const validation = validateCourseData(data);
    if (!isValidCourse(validation)) {
      return { success: false, error: 'Invalid course data' };
    }

    // Create course record with your actual schema
    const courseInsertData = {
      course_name: data.course_name.trim(),
      course_description: data.course_description.trim(),
      course_language: data.course_language.trim(),
      teacher_id: user.id, // Use teacher_id from your schema
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      canvas_count: 1, // Default value
      lesson_days_count: 1 // Default value
    };

    console.log('Inserting course data:', courseInsertData);

    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .insert(courseInsertData)
      .select('id')
      .single();

    if (courseError) {
      console.error('Error creating course:', courseError);
      return { success: false, error: `Failed to create course: ${courseError.message}` };
    }

    const courseId = courseData.id;
    console.log('Course created successfully with ID:', courseId);

    // Upload image if provided
    if (data.course_image) {
      console.log('Uploading course image...');
      const imageUrl = await uploadCourseImage(data.course_image, courseId);
      if (imageUrl) {
        console.log('Updating course with image URL:', imageUrl);
        // Update course with image URL using course_image field
        const { error: updateError } = await supabase
          .from('courses')
          .update({ course_image: imageUrl })
          .eq('id', courseId);
        
        if (updateError) {
          console.error('Error updating course with image:', updateError);
          // Don't fail the entire operation for image update failure
          console.warn('Course created but image update failed');
        }
      }
    }

    return { success: true, courseId };
  } catch (error) {
    console.error('Error in createCourse:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Helper function to ensure user profile exists
async function ensureUserProfile(user: any): Promise<void> {
  try {
    // First try using the database function
    const { error: rpcError } = await supabase.rpc('ensure_user_profile', {
      user_id: user.id,
      user_email: user.email,
      user_role: 'teacher'
    });

    if (rpcError) {
      console.warn('RPC call failed, using fallback method:', rpcError);
      // Fallback to direct upsert
      await ensureUserProfileFallback(user);
    }
  } catch (error) {
    console.warn('Error ensuring user profile, using fallback:', error);
    await ensureUserProfileFallback(user);
  }
}

// Fallback method to ensure user profile exists
async function ensureUserProfileFallback(user: any): Promise<void> {
  try {
    const userMetadata = user.user_metadata || {};
    const fullName = userMetadata.full_name || user.email?.split('@')[0] || 'User';
    const userRole = userMetadata.user_role || 'teacher';
    
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        role: userRole,
        institution: 'Independent'
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Failed to create user profile:', error);
    } else {
      console.log('User profile ensured via fallback method');
    }
  } catch (error) {
    console.error('Error in ensureUserProfileFallback:', error);
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
      query = query.eq('teacher_id', userId); // Fixed: using teacher_id instead of user_id
    } else {
      // Get current user's courses
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return [];
      query = query.eq('teacher_id', user.id); // Fixed: using teacher_id instead of user_id
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
