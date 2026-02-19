// ==========================================================================
// COURSE CREATION & CRUD OPERATIONS
// ==========================================================================

import { supabase } from "../../supabase";
import { uploadCourseImage, deleteCourseImage } from "../shared/uploadCourseImage";

// Course creation interface
export interface CourseCreationData {
 course_name: string;
 course_subtitle?: string;
 course_description: string;
 course_language: string;
 course_type: string;
 course_image?: File | null;
 teacher_id?: string;
 institution?: string;
 course_pedagogy?: { x: number; y: number } | null;
 // teacher_id will be auto-filled from auth
 // Other fields will have defaults or be added later
}

// Course validation rules
export interface CourseValidation {
 course_name: boolean;
 course_description: boolean;
 course_language: boolean;
 course_type: boolean;
 course_image: boolean;
 teacher_id: boolean;
 institution: boolean;
}

// ==========================================================================
// VALIDATION
// ==========================================================================

export function validateCourseData(
 data: Partial<CourseCreationData>,
): CourseValidation {
 return {
 course_name: Boolean(
 data.course_name && data.course_name.trim().length >= 3,
 ),
 course_description: Boolean(
 data.course_description && data.course_description.trim().length >= 10,
 ),
 course_language: Boolean(
 data.course_language && data.course_language.trim(),
 ),
 course_type: Boolean(
 data.course_type && 
 data.course_type.trim() && 
 ['In-person', 'Online', 'Hybrid'].includes(data.course_type.trim())
 ),
 course_image: true, // Course image is optional for new courses
 teacher_id: Boolean(data.teacher_id && data.teacher_id.trim()),
 institution: Boolean(data.institution && data.institution.trim()),
 };
}

export function isValidCourse(validation: CourseValidation): boolean {
 return Object.values(validation).every((isValid) => isValid);
}

// ==========================================================================
// COURSE CRUD OPERATIONS
// ==========================================================================

export async function createCourse(
 data: CourseCreationData,
): Promise<{ success: boolean; courseId?: string; error?: string }> {
 try {
 // Enhanced authentication check with session validation
 const {
 data: { session },
 error: sessionError,
 } = await supabase.auth.getSession();
 if (sessionError) {
 console.error("Session error:", sessionError);
 return { success: false, error: "Authentication session error" };
 }

 if (!session?.user) {
 console.error("No valid session or user found");
 return {
 success: false,
 error: "User not authenticated - please sign in again",
 };
 }

 const user = session.user;

 // Ensure user profile exists in users table
 await ensureUserProfile(user);

 const userMetadata = user.user_metadata || {};
 const normalizedData: CourseCreationData = {
 ...data,
 teacher_id: data.teacher_id?.trim() || user.id,
 institution:
 data.institution?.trim() ||
 userMetadata.institution ||
 "Independent",
 };

 // Validate data
 const validation = validateCourseData(normalizedData);
 if (!isValidCourse(validation)) {
 const missingFields = Object.entries(validation)
 .filter(([_, isValid]) => !isValid)
 .map(([field, _]) => field.replace('_', ' '))
 .join(', ');
 return { success: false, error: `Missing or invalid: ${missingFields}` };
 }

 // Create course record with your actual schema
 const courseInsertData = {
 course_name: normalizedData.course_name,
 course_subtitle: normalizedData.course_subtitle?.trim() || null,
 course_description: normalizedData.course_description,
 course_language: normalizedData.course_language.trim(),
 course_type: normalizedData.course_type.trim(),
 teacher_id: normalizedData.teacher_id, // Use teacher_id from your schema
 institution: normalizedData.institution,
 template_settings: {},
 schedule_settings: {},
 curriculum_data: {},
 generation_settings: {
 required_context: ["essentials", "classification", "pedagogy"],
 optional_context: {
 schedule: true,
 structure: true,
 existing: false,
 },
 updated_at: new Date().toISOString(),
 },
 students_overview: {
 total: 0,
 synced: 0,
 grade_levels: [],
 updated_at: new Date().toISOString(),
 },
 visibility_settings: {
 course_visible: false,
 allow_enrollment: true,
 require_approval: false,
 enable_notifications: false,
 public_course: false,
 },
 marketplace_settings: {
 listing_status: "draft",
 target_audience: "",
 revenue_share: null,
 distribution_channels: "",
 },
 resources_settings: {
 resource_policy: "",
 allow_student_uploads: false,
 default_storage_provider: "internal",
 featured_resources: "",
 },
 pricing_settings: {
 pricing_model: "free",
 base_price: null,
 currency: "USD",
 trial_available: false,
 discount_notes: "",
 },
 integration_settings: {
 lms_provider: "None",
 api_access: false,
 webhook_url: "",
 integration_notes: "",
 },
 communication_settings: {
 welcome_message: "",
 announcement_channel: "email",
 enable_updates: false,
 office_hours: "",
 },
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 };

 const { data: courseData, error: courseError } = await supabase
 .from("courses")
 .insert(courseInsertData)
 .select("id")
 .single();

 if (courseError) {
 console.error("❌ Error creating course:", {
   code: courseError.code,
   message: courseError.message,
   details: courseError.details,
   hint: (courseError as any).hint,
   fullError: courseError
 });
 return {
 success: false,
 error: `Failed to create course: ${courseError.message}`,
 };
 }

 console.log('✅ Course created with ID:', courseId);
 const courseId = courseData.id;

 // Upload image if provided
 if (normalizedData.course_image) {
 const imageUrl = await uploadCourseImage({
 file: normalizedData.course_image,
 courseId,
 });
 if (imageUrl) {
 // Update course with image URL using course_image field
 const { error: updateError } = await supabase
 .from("courses")
 .update({ course_image: imageUrl })
 .eq("id", courseId);

 if (updateError) {
 console.error("Error updating course with image:", updateError);
 await deleteCourseImage(imageUrl);
 // Don't fail the entire operation for image update failure
 console.warn("Course created but image update failed");
 }
 }
 }

 return { success: true, courseId };
 } catch (error) {
 console.error("Error in createCourse:", error);
 return { success: false, error: "Unexpected error occurred" };
 }
}

// Helper function to ensure user profile exists
async function ensureUserProfile(user: any): Promise<void> {
 try {
 // First try using the database function
 const { error: rpcError } = await supabase.rpc("ensure_user_profile", {
 user_id: user.id,
 user_email: user.email,
 user_role: "teacher",
 });

 if (rpcError) {
 console.warn("RPC call failed, using fallback method:", rpcError);
 // Fallback to direct upsert
 await ensureUserProfileFallback(user);
 }
 } catch (error) {
 console.warn("Error ensuring user profile, using fallback:", error);
 await ensureUserProfileFallback(user);
 }
}

// Fallback method to ensure user profile exists
async function ensureUserProfileFallback(user: any): Promise<void> {
 try {
 const userMetadata = user.user_metadata || {};
 const fullName =
 userMetadata.full_name || user.email?.split("@")[0] || "User";
 const userRole = userMetadata.user_role || "teacher";

 const nameParts = fullName.split(" ");
 const firstName = nameParts[0] || "";
 const lastName = nameParts.slice(1).join(" ") || "";

 const { error } = await supabase.from("users").upsert(
 {
 id: user.id,
 first_name: firstName,
 last_name: lastName,
 email: user.email,
 role: userRole,
 institution: "Independent",
 },
 {
 onConflict: "id",
 },
 );

 if (error) {
 console.error("Failed to create user profile:", error);
 } else {
  
 }
 } catch (error) {
 console.error("Error in ensureUserProfileFallback:", error);
 }
}

export async function updateCourse(
 courseId: string,
 data: Partial<CourseCreationData>,
): Promise<{ success: boolean; error?: string }> {
 try {
 // Filter out File objects and other non-serializable values
 const cleanData: Record<string, any> = {};
 for (const [key, value] of Object.entries(data)) {
 if (value instanceof File) {
 // Skip file objects - they should be handled separately via uploadCourseImage
 console.log(`⏭️  Skipping File object for key: ${key}`);
 continue;
 }
 cleanData[key] = value;
 }

 console.log('📤 Sending update to Supabase:', {
 courseId,
 data: cleanData,
 timestamp: new Date().toISOString()
 });

 const { error } = await supabase
 .from("courses")
 .update({
 ...cleanData,
 updated_at: new Date().toISOString(),
 })
 .eq("id", courseId);

 if (error) {
 console.error("❌ Error updating course in Supabase:", {
 courseId,
 error: error.message,
 details: error.details,
 hint: error.hint,
 code: error.code
 });
 return { success: false, error: error.message || "Failed to update course" };
 }

 console.log('✅ Course updated successfully in Supabase:', courseId);
 return { success: true };
 } catch (error) {
 console.error("❌ Error in updateCourse:", error);
 return { success: false, error: error instanceof Error ? error.message : "Unexpected error occurred" };
 }
}

export async function deleteCourse(
 courseId: string,
): Promise<{ success: boolean; error?: string }> {
 try {
 const { error } = await supabase
 .from("courses")
 .delete()
 .eq("id", courseId);

 if (error) {
 console.error("Error deleting course:", error);
 return { success: false, error: "Failed to delete course" };
 }

 return { success: true };
 } catch (error) {
 console.error("Error in deleteCourse:", error);
 return { success: false, error: "Unexpected error occurred" };
 }
}

export async function getCourse(courseId: string) {
 try {
 const { data, error } = await supabase
 .from("courses")
 .select("*")
 .eq("id", courseId)
 .single();

 if (error) {
 console.error("Error fetching course:", error);
 return null;
 }

 return data;
 } catch (error) {
 console.error("Error in getCourse:", error);
 return null;
 }
}

export async function getUserCourses(userId?: string) {
 try {
 let query = supabase.from("courses").select("*");

 if (userId) {
 query = query.eq("teacher_id", userId); // Fixed: using teacher_id instead of user_id
 } else {
 // Get current user's courses
 const {
 data: { user },
 error: authError,
 } = await supabase.auth.getUser();
 
 if (authError) {
 console.error("❌ Auth error in getUserCourses:", authError);
 return [];
 }
 
 if (!user) {
 console.warn("⚠️ No authenticated user found in getUserCourses");
 return [];
 }
 
 query = query.eq("teacher_id", user.id); // Fixed: using teacher_id instead of user_id
 }

 const { data, error } = await query.order("created_at", {
 ascending: false,
 });

 if (error) {
 console.error("❌ Error fetching courses:", error);
 console.error("   Error code:", error.code);
 console.error("   Error message:", error.message);
 console.error("   Error details:", error.details);
 console.error("   Error hint:", error.hint);
 
 // Check if it's an RLS/permission error
 if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
   console.error("   ⚠️ This looks like an RLS (Row Level Security) policy issue");
   console.error("   Make sure you're authenticated and have the correct permissions");
 }
 
 return [];
 }

 return data || [];
 } catch (error) {
 console.error("❌ Exception in getUserCourses:", error);
 return [];
 }
}
