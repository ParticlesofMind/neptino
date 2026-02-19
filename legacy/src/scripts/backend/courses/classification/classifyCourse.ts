// ==========================================================================
// COURSE CLASSIFICATION & CRUD OPERATIONS
// ==========================================================================

import { supabase } from "../../supabase";

// Course classification interface
export interface CourseClassificationData {
 class_year: string;
 curricular_framework: string;
 domain: string;
 subject: string;
 topic: string;
 subtopic?: string;
 previous_course?: string;
 current_course?: string;
 next_course?: string;
 // course_id will be provided when updating existing course
}

// Classification validation rules
export interface ClassificationValidation {
 class_year: boolean;
 curricular_framework: boolean;
 domain: boolean;
 subject: boolean;
 topic: boolean;
 subtopic: boolean;
 previous_course: boolean;
 current_course: boolean;
 next_course: boolean;
}

// ==========================================================================
// CLASSIFICATION DATA LOADERS
// ==========================================================================

let classYearData: any = null;
let curricularFrameworkData: any = null;
let iscedData: any = null;

export async function loadClassYearData() {
 if (!classYearData) {
 try {
 const response = await fetch(
 "/src/scripts/json/classification/classYear.json",
 );
 classYearData = await response.json();
 } catch (error) {
 console.error("Error loading class year data:", error);
 classYearData = { classYears: [] };
 }
 }
 return classYearData;
}

export async function loadCurricularFrameworkData() {
 if (!curricularFrameworkData) {
 try {
 const response = await fetch(
 "/src/scripts/json/classification/curricularFramework.json",
 );
 curricularFrameworkData = await response.json();
 } catch (error) {
 console.error("Error loading curricular framework data:", error);
 curricularFrameworkData = { curricularFrameworks: [] };
 }
 }
 return curricularFrameworkData;
}

export async function loadIscedData() {
 if (!iscedData) {
 try {
 const response = await fetch(
 "/src/scripts/json/classification/isced2011.json",
 );
 iscedData = await response.json();
 } catch (error) {
 console.error("Error loading ISCED data:", error);
 iscedData = { domains: [] };
 }
 }
 return iscedData;
}

// ==========================================================================
// CLASSIFICATION HELPERS
// ==========================================================================

export function getSubjectsByDomain(domainValue: string): any[] {
 if (!iscedData) return [];
 const domain = iscedData.domains.find((d: any) => d.value === domainValue);
 return domain ? domain.subjects : [];
}

export function getTopicsBySubject(
 domainValue: string,
 subjectValue: string,
): any[] {
 if (!iscedData) return [];
 const domain = iscedData.domains.find((d: any) => d.value === domainValue);
 if (!domain) return [];
 const subject = domain.subjects.find((s: any) => s.value === subjectValue);
 return subject ? subject.topics : [];
}

export function getSubtopicsByTopic(
 domainValue: string,
 subjectValue: string,
 topicValue: string,
): any[] {
 if (!iscedData) return [];
 const domain = iscedData.domains.find((d: any) => d.value === domainValue);
 if (!domain) return [];
 const subject = domain.subjects.find((s: any) => s.value === subjectValue);
 if (!subject) return [];
 const topic = subject.topics.find((t: any) => t.value === topicValue);
 return topic ? topic.subtopics || [] : [];
}

// ==========================================================================
// VALIDATION
// ==========================================================================

export function validateClassificationData(
 data: Partial<CourseClassificationData>,
): ClassificationValidation {
 return {
 class_year: Boolean(data.class_year && data.class_year.trim()),
 curricular_framework: Boolean(
 data.curricular_framework && data.curricular_framework.trim(),
 ),
 domain: Boolean(data.domain && data.domain.trim()),
 subject: Boolean(data.subject && data.subject.trim()),
 topic: Boolean(data.topic && data.topic.trim()),
 subtopic: true, // Optional field
 previous_course: true, // Optional field
 current_course: true, // Optional field
 next_course: true, // Optional field
 };
}

export function isValidClassification(
 validation: ClassificationValidation,
): boolean {
 // Only require the mandatory fields
 const requiredFields = [
 "class_year",
 "curricular_framework",
 "domain",
 "subject",
 "topic",
 ];

 return requiredFields.every(
 (field) => validation[field as keyof ClassificationValidation],
 );
}

// ==========================================================================
// COURSE CLASSIFICATION CRUD OPERATIONS
// ==========================================================================

export async function savePartialCourseClassification(
 courseId: string,
 data: Partial<CourseClassificationData>,
): Promise<{ success: boolean; error?: string }> {
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
 console.log(
 "Saving partial course classification for user:",
 user.id,
 "course:",
 courseId,
 );

 // Verify course ownership and fetch existing classification data
 const { data: courseData, error: courseError } = await supabase
 .from("courses")
 .select("teacher_id, classification_data")
 .eq("id", courseId)
 .single();

 if (courseError) {
 console.error("Error fetching course:", courseError);
 return { success: false, error: "Course not found" };
 }

 if (courseData.teacher_id !== user.id) {
 return {
 success: false,
 error: "Unauthorized - you can only modify your own courses",
 };
 }

 // Get existing classification data and merge with new data
 const existingClassificationData = courseData.classification_data || {};
 const classificationData: any = { ...existingClassificationData };

 // Only update fields that have non-empty values (preserve existing if empty)
 // This ensures we don't overwrite existing data with empty strings
 if (data.class_year !== undefined) {
   const trimmed = data.class_year.trim();
   if (trimmed) {
     classificationData.class_year = trimmed;
   }
 }
 if (data.curricular_framework !== undefined) {
   const trimmed = data.curricular_framework.trim();
   if (trimmed) {
     classificationData.curricular_framework = trimmed;
   }
 }
 if (data.domain !== undefined) {
   const trimmed = data.domain.trim();
   if (trimmed) {
     classificationData.domain = trimmed;
   }
 }
 if (data.subject !== undefined) {
   const trimmed = data.subject.trim();
   if (trimmed) {
     classificationData.subject = trimmed;
   }
 }
 if (data.topic !== undefined) {
   const trimmed = data.topic.trim();
   if (trimmed) {
     classificationData.topic = trimmed;
   }
 }
 if (data.subtopic !== undefined) {
   const trimmed = data.subtopic?.trim() || "";
   if (trimmed) {
     classificationData.subtopic = trimmed;
   } else if (data.subtopic === "") {
     // Explicitly clear if empty string is passed
     classificationData.subtopic = null;
   }
 }
 if (data.previous_course !== undefined) {
   const trimmed = data.previous_course?.trim() || "";
   if (trimmed) {
     classificationData.previous_course = trimmed;
   } else if (data.previous_course === "") {
     classificationData.previous_course = null;
   }
 }
 if (data.current_course !== undefined) {
   const trimmed = data.current_course?.trim() || "";
   if (trimmed) {
     classificationData.current_course = trimmed;
   } else if (data.current_course === "") {
     classificationData.current_course = null;
   }
 }
 if (data.next_course !== undefined) {
   const trimmed = data.next_course?.trim() || "";
   if (trimmed) {
     classificationData.next_course = trimmed;
   } else if (data.next_course === "") {
     classificationData.next_course = null;
   }
 }

 console.log(
 "Saving partial course classification data:",
 {
   incoming: data,
   existing: existingClassificationData,
   merged: classificationData,
 },
 );

 // Update course with classification data in the JSONB column
 const { error: updateError } = await supabase
 .from("courses")
 .update({
 classification_data: classificationData,
 updated_at: new Date().toISOString(),
 })
 .eq("id", courseId);

 if (updateError) {
 console.error("Error updating course classification:", updateError);
 return {
 success: false,
 error: `Failed to update classification: ${updateError.message}`,
 };
 }

 return { success: true };
 } catch (error) {
 console.error("Error in savePartialCourseClassification:", error);
 return { success: false, error: "Unexpected error occurred" };
 }
}

export async function updateCourseClassification(
 courseId: string,
 data: CourseClassificationData,
): Promise<{ success: boolean; error?: string }> {
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
 console.log(
 "Updating course classification for user:",
 user.id,
 "course:",
 courseId,
 );

 // Validate data
 const validation = validateClassificationData(data);
 if (!isValidClassification(validation)) {
 return {
 success: false,
 error: "Invalid classification data - required fields missing",
 };
 }

 // Verify course ownership
 const { data: courseData, error: courseError } = await supabase
 .from("courses")
 .select("teacher_id")
 .eq("id", courseId)
 .single();

 if (courseError) {
 console.error("Error fetching course:", courseError);
 return { success: false, error: "Course not found" };
 }

 if (courseData.teacher_id !== user.id) {
 return {
 success: false,
 error: "Unauthorized - you can only modify your own courses",
 };
 }

 // Prepare classification data for JSONB column
 const classificationData = {
 class_year: data.class_year.trim(),
 curricular_framework: data.curricular_framework.trim(),
 domain: data.domain.trim(),
 subject: data.subject.trim(),
 topic: data.topic.trim(),
 subtopic: data.subtopic?.trim() || null,
 previous_course: data.previous_course?.trim() || null,
 current_course: data.current_course?.trim() || null,
 next_course: data.next_course?.trim() || null,
 updated_at: new Date().toISOString(),
 };

 // Update course with classification data in the JSONB column
 const { error: updateError } = await supabase
 .from("courses")
 .update({
 classification_data: classificationData,
 updated_at: new Date().toISOString(),
 })
 .eq("id", courseId);

 if (updateError) {
 console.error("Error updating course classification:", updateError);
 return {
 success: false,
 error: `Failed to update classification: ${updateError.message}`,
 };
 }

 return { success: true };
 } catch (error) {
 console.error("Error in updateCourseClassification:", error);
 return { success: false, error: "Unexpected error occurred" };
 }
}

export async function getCourseClassification(
 courseId: string,
): Promise<CourseClassificationData | null> {
 try {
 const { data, error } = await supabase
 .from("courses")
 .select("classification_data")
 .eq("id", courseId)
 .single();

 if (error) {
 console.error("Error fetching course classification:", error);
 return null;
 }

 // Extract classification data from JSONB column
 const classificationData = data?.classification_data || {};

 console.log("Loading classification data from database:", classificationData);

 // Return the classification data with proper structure
 // Use nullish coalescing to preserve empty strings and only default to "" for null/undefined
 const result = {
 class_year: classificationData.class_year ?? "",
 curricular_framework: classificationData.curricular_framework ?? "",
 domain: classificationData.domain ?? "",
 subject: classificationData.subject ?? "",
 topic: classificationData.topic ?? "",
 subtopic: classificationData.subtopic ?? undefined,
 previous_course: classificationData.previous_course ?? undefined,
 current_course: classificationData.current_course ?? undefined,
 next_course: classificationData.next_course ?? undefined,
 };

 console.log("Returning classification data:", result);
 return result;
 } catch (error) {
 console.error("Error in getCourseClassification:", error);
 return null;
 }
}

export async function getAvailableCourses(
 userId?: string,
): Promise<Array<{ id: string; course_name: string }>> {
 try {
 let query = supabase
 .from("courses")
 .select("id, course_name")
 .order("course_name");

 if (userId) {
 query = query.eq("teacher_id", userId);
 } else {
 // Get current user's courses
 const {
 data: { user },
 error: authError,
 } = await supabase.auth.getUser();
 if (authError || !user) return [];
 query = query.eq("teacher_id", user.id);
 }

 const { data, error } = await query;

 if (error) {
 console.error("Error fetching available courses:", error);
 return [];
 }

 return data || [];
 } catch (error) {
 console.error("Error in getAvailableCourses:", error);
 return [];
 }
}

// ==========================================================================
// CLASSIFICATION FORM HELPERS
// ==========================================================================

export interface ClassificationFormState {
 selectedDomain: string;
 selectedSubject: string;
 selectedTopic: string;
 selectedSubtopic: string;
 availableSubjects: any[];
 availableTopics: any[];
 availableSubtopics: any[];
}

export function initializeClassificationFormState(): ClassificationFormState {
 return {
 selectedDomain: "",
 selectedSubject: "",
 selectedTopic: "",
 selectedSubtopic: "",
 availableSubjects: [],
 availableTopics: [],
 availableSubtopics: [],
 };
}

export function updateClassificationFormState(
 state: ClassificationFormState,
 field: keyof ClassificationFormState,
 value: string,
): ClassificationFormState {
 const newState = { ...state };

 switch (field) {
 case "selectedDomain":
 newState.selectedDomain = value;
 newState.selectedSubject = "";
 newState.selectedTopic = "";
 newState.selectedSubtopic = "";
 newState.availableSubjects = getSubjectsByDomain(value);
 newState.availableTopics = [];
 newState.availableSubtopics = [];
 break;

 case "selectedSubject":
 newState.selectedSubject = value;
 newState.selectedTopic = "";
 newState.selectedSubtopic = "";
 newState.availableTopics = getTopicsBySubject(
 state.selectedDomain,
 value,
 );
 newState.availableSubtopics = [];
 break;

 case "selectedTopic":
 newState.selectedTopic = value;
 newState.selectedSubtopic = "";
 newState.availableSubtopics = getSubtopicsByTopic(
 state.selectedDomain,
 state.selectedSubject,
 value,
 );
 break;

 case "selectedSubtopic":
 newState.selectedSubtopic = value;
 break;
 }

 return newState;
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================

export async function initializeClassificationData(): Promise<void> {
 try {
 // Load all classification data in parallel
 await Promise.all([
 loadClassYearData(),
 loadCurricularFrameworkData(),
 loadIscedData(),
 ]);

 } catch (error) {
 console.error("Error initializing classification data:", error);
 }
}
