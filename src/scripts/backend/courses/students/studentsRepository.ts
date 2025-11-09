import { supabase } from "../../supabase.js";
import type {
  RepositoryResult,
  RosterSummary,
  StudentRecord,
} from "./studentsTypes.js";

const DEFAULT_GRADE_LEVEL = "Unspecified";

function normalizeDate(input?: string | null): string | null {
  if (!input) return null;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeLearningStyle(value?: string[] | string | null): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  return value
    .split(/[,;/|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export class StudentsRepository {
  private courseId: string | null;

  constructor(courseId?: string | null) {
    this.courseId = courseId ?? null;
  }

  public setCourseId(courseId: string | null): void {
    this.courseId = courseId ?? null;
  }

  public getCourseId(): string | null {
    return this.courseId;
  }

  public async fetchRoster(): Promise<RepositoryResult<StudentRecord[]>> {
    if (!this.courseId) {
      console.warn("⚠️ fetchRoster: No courseId set");
      return { data: [], error: null };
    }

    console.log("📋 fetchRoster: Fetching enrollments for courseId:", this.courseId);

    // Use new schema (enrollments with metadata) - prefer this always
    // Use left join for users in case some enrollments don't have matching users yet
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from("enrollments")
      .select(
        "id, student_id, course_id, enrolled_at, status, metadata, users(email)",
      )
      .eq("course_id", this.courseId);

    console.log("📋 fetchRoster: Found", enrollmentData?.length || 0, "enrollments");
    if (enrollmentData && enrollmentData.length > 0) {
      console.log("📋 fetchRoster: Sample enrollment:", JSON.stringify(enrollmentData[0], null, 2));
    }

    // If metadata column doesn't exist (migrations not run), provide helpful error
    if (enrollmentError) {
      if (enrollmentError.code === '42703' && enrollmentError.message?.includes('metadata')) {
        console.error('❌ Database migrations not run: enrollments.metadata column does not exist');
        console.error('Please run the database migrations before using the students feature');
        return { 
          data: [], 
          error: {
            ...enrollmentError,
            message: 'Database schema not up to date. Please run migrations to add enrollments.metadata column.'
          } as any
        };
      }
      // For other errors, return them as-is
      return { data: [], error: enrollmentError };
    }

    // Transform enrollment data to StudentRecord format
    const students: StudentRecord[] = (enrollmentData ?? []).map((enrollment: any) => {
      const metadata = enrollment.metadata || {};
      // Handle both single user object and array (from join)
      const user = Array.isArray(enrollment.users) 
        ? (enrollment.users.length > 0 ? enrollment.users[0] : null)
        : enrollment.users;
      
      // Use email from user if available, otherwise try metadata.email
      // This handles migrated students that might not have matching users
      const email = user?.email || metadata.email || null;
      
      return {
        id: enrollment.id,
        first_name: metadata.first_name || "",
        last_name: metadata.last_name || "",
        email: email,
        student_id: metadata.student_id || null,
        grade_level: metadata.grade_level || null,
        learning_style: metadata.learning_style || null,
        assessment_score: metadata.assessment_score || null,
        enrollment_date: metadata.enrollment_date || enrollment.enrolled_at?.slice(0, 10) || null,
        notes: metadata.notes || null,
        course_id: enrollment.course_id,
        created_by: metadata.created_by || null,
        synced_at: metadata.synced_at || null,
      };
    });

    // Sort by last_name if available
    students.sort((a, b) => {
      const aName = a.last_name || "";
      const bName = b.last_name || "";
      return aName.localeCompare(bName);
    });

    console.log("📋 fetchRoster: Returning", students.length, "students");
    if (students.length > 0) {
      console.log("📋 fetchRoster: Sample student:", {
        id: students[0].id,
        name: `${students[0].first_name} ${students[0].last_name}`,
        email: students[0].email,
        hasMetadata: !!enrollmentData?.[0]?.metadata
      });
    }

    return { data: students, error: null };
  }

  public async fetchSummary(): Promise<RepositoryResult<RosterSummary>> {
    if (!this.courseId) {
      return {
        data: { total: 0, synced: 0, gradeLevels: [] },
        error: null,
      };
    }

    // Use new schema (enrollments with metadata)
    const { data, error } = await supabase
      .from("enrollments")
      .select("metadata", { count: "exact", head: false })
      .eq("course_id", this.courseId);

    if (error) {
      if (error.code === '42703' && error.message?.includes('metadata')) {
        console.error('❌ Database migrations not run: enrollments.metadata column does not exist');
        return { 
          data: null, 
          error: {
            ...error,
            message: 'Database schema not up to date. Please run migrations.'
          } as any
        };
      }
      return { data: null, error };
    }

    const gradeLevels = new Set<string>();
    let synced = 0;

    (data ?? []).forEach((row: { metadata?: any }) => {
      const metadata = row.metadata || {};
      if (metadata.grade_level) {
        gradeLevels.add(metadata.grade_level);
      }
      if (metadata.synced_at) {
        synced += 1;
      }
    });

    return {
      data: {
        total: data?.length ?? 0,
        synced,
        gradeLevels: Array.from(gradeLevels.values()),
      },
      error: null,
    };
  }

  public async upsertStudents(
    students: StudentRecord[],
  ): Promise<RepositoryResult<StudentRecord[]>> {
    if (!students.length) {
      return { data: [], error: null };
    }

    if (!this.courseId) {
      throw new Error("Course ID is required to save students.");
    }

    // Always use new schema (enrollments.metadata)
    // Check if metadata column exists first
    const { error: metadataCheckError } = await supabase
      .from("enrollments")
      .select("metadata")
      .limit(1);

    if (metadataCheckError && metadataCheckError.code === '42703' && metadataCheckError.message?.includes('metadata')) {
      console.error('❌ Database migrations not run: enrollments.metadata column does not exist');
      return { 
        data: [], 
        error: {
          ...metadataCheckError,
          message: 'Database schema not up to date. Please run migrations to add enrollments.metadata column.'
        } as any
      };
    }

    // New schema: use enrollments with metadata
    const createdBy = await this.resolveCurrentUserId();
    const results: StudentRecord[] = [];

    // Process each student: find/create user, then create/update enrollment
    for (const student of students) {
      try {
        // Step 1: Find or create user by email
        let userId: string | null = null;
        
        if (student.email) {
          // Try to find existing user
          const { data: existingUser, error: lookupError } = await supabase
            .from("users")
            .select("id")
            .eq("email", student.email)
            .maybeSingle();

          if (existingUser) {
            userId = existingUser.id;
          } else if (lookupError && lookupError.code !== 'PGRST116') {
            // PGRST116 is "no rows returned" which is expected when user doesn't exist
            // Other errors are real problems
            console.error("Error looking up user:", student.email, lookupError);
            continue;
          } else {
            // User doesn't exist, try to create one
            // Generate a UUID explicitly to avoid defaulting to auth.uid() (teacher's ID)
            const newUserId = typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `user_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
            
            // Try to insert with explicit ID first
            const { data: newUser, error: userError } = await supabase
              .from("users")
              .insert({
                id: newUserId,
                email: student.email,
                first_name: student.first_name,
                last_name: student.last_name,
                role: "student",
              })
              .select("id")
              .single();

            if (userError) {
              // If it's a duplicate key error on email (23505), user was created between lookup and insert
              // Try to fetch the existing user
              if (userError.code === '23505' || userError.message?.includes('duplicate key') || userError.message?.includes('unique constraint')) {
                const { data: retryUser } = await supabase
                  .from("users")
                  .select("id")
                  .eq("email", student.email)
                  .maybeSingle();
                
                if (retryUser) {
                  userId = retryUser.id;
                } else {
                  console.error("Failed to find user after duplicate key error:", student.email, userError);
                  continue;
                }
              } else {
                console.error("Failed to create user for student:", student.email, userError);
                continue;
              }
            } else if (newUser) {
              userId = newUser.id;
            } else {
              console.error("User creation returned no data:", student.email);
              continue;
            }
          }
        } else {
          // No email - cannot create enrollment without user
          console.warn("Skipping student without email:", student);
          continue;
        }

        if (!userId) {
          continue;
        }

        // Step 2: Build metadata object
        const metadata = {
          first_name: student.first_name,
          last_name: student.last_name,
          grade_level: student.grade_level ?? DEFAULT_GRADE_LEVEL,
          learning_style: normalizeLearningStyle(student.learning_style ?? null),
          notes: student.notes || null,
          assessment_score: student.assessment_score || null,
          enrollment_date: normalizeDate(student.enrollment_date ?? null),
          student_id: student.student_id || null,
          synced_at: student.synced_at || null,
          created_by: student.created_by ?? createdBy,
        };

        // Step 3: Upsert enrollment with metadata
        const enrollmentDate = student.enrollment_date 
          ? new Date(student.enrollment_date).toISOString()
          : new Date().toISOString();

        const { data: enrollment, error: enrollmentError } = await supabase
          .from("enrollments")
          .upsert(
            {
              student_id: userId,
              course_id: this.courseId,
              enrolled_at: enrollmentDate,
              status: "active",
              metadata: metadata,
            },
            {
              onConflict: "student_id,course_id",
              ignoreDuplicates: false,
            },
          )
          .select("id, student_id, course_id, enrolled_at, status, metadata, users(email)")
          .single();

        if (enrollmentError || !enrollment) {
          console.error("Failed to upsert enrollment:", enrollmentError);
          continue;
        }

        // Step 4: Transform back to StudentRecord
        const user = Array.isArray(enrollment.users) ? enrollment.users[0] : enrollment.users;
        const enrollmentMetadata = enrollment.metadata || {};
        
        results.push({
          id: enrollment.id,
          first_name: enrollmentMetadata.first_name || "",
          last_name: enrollmentMetadata.last_name || "",
          email: user?.email || null,
          student_id: enrollmentMetadata.student_id || null,
          grade_level: enrollmentMetadata.grade_level || null,
          learning_style: enrollmentMetadata.learning_style || null,
          assessment_score: enrollmentMetadata.assessment_score || null,
          enrollment_date: enrollmentMetadata.enrollment_date || enrollment.enrolled_at?.slice(0, 10) || null,
          notes: enrollmentMetadata.notes || null,
          course_id: enrollment.course_id,
          created_by: enrollmentMetadata.created_by || null,
          synced_at: enrollmentMetadata.synced_at || null,
        });
      } catch (error) {
        console.error("Error processing student:", student, error);
      }
    }

    return { data: results, error: null };
  }

  public async updateStudent(studentId: string, updates: Partial<StudentRecord>): Promise<RepositoryResult<StudentRecord>> {
    if (!this.courseId || !studentId) {
      return { data: null, error: { message: "Course ID and Student ID are required" } as unknown as any };
    }

    // Always use new schema (enrollments.metadata)
    // Check if metadata column exists
    const { error: metadataCheckError } = await supabase
      .from("enrollments")
      .select("metadata")
      .limit(1);

    if (metadataCheckError && metadataCheckError.code === '42703' && metadataCheckError.message?.includes('metadata')) {
      console.error('❌ Database migrations not run: enrollments.metadata column does not exist');
      return { 
        data: null, 
        error: {
          ...metadataCheckError,
          message: 'Database schema not up to date. Please run migrations.'
        } as any
      };
    }

    // New schema: update enrollment metadata
    const { data: currentEnrollment, error: fetchError } = await supabase
      .from("enrollments")
      .select("metadata")
      .eq("id", studentId)
      .eq("course_id", this.courseId)
      .single();

    if (fetchError || !currentEnrollment) {
      return { data: null, error: fetchError || { message: "Enrollment not found" } as unknown as any };
    }

    // Build updated metadata
    const currentMetadata = currentEnrollment.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...(updates.first_name !== undefined && { first_name: updates.first_name }),
      ...(updates.last_name !== undefined && { last_name: updates.last_name }),
      ...(updates.grade_level !== undefined && { 
        grade_level: updates.grade_level === "" ? DEFAULT_GRADE_LEVEL : updates.grade_level 
      }),
      ...(updates.learning_style !== undefined && { 
        learning_style: normalizeLearningStyle(updates.learning_style ?? null) 
      }),
      ...(updates.notes !== undefined && { notes: updates.notes || null }),
      ...(updates.assessment_score !== undefined && { assessment_score: updates.assessment_score || null }),
      ...(updates.enrollment_date !== undefined && { 
        enrollment_date: normalizeDate(updates.enrollment_date ?? null) 
      }),
      ...(updates.student_id !== undefined && { student_id: updates.student_id || null }),
      ...(updates.synced_at !== undefined && { synced_at: updates.synced_at || null }),
    };

    // Update enrollment metadata
    const { data: enrollment, error } = await supabase
      .from("enrollments")
      .update({ metadata: updatedMetadata })
      .eq("id", studentId)
      .eq("course_id", this.courseId)
      .select("id, student_id, course_id, enrolled_at, status, metadata, users!inner(email)")
      .single();

    if (error || !enrollment) {
      return { data: null, error: error || { message: "Update failed" } as unknown as any };
    }

    // Transform back to StudentRecord
    const user = Array.isArray(enrollment.users) ? enrollment.users[0] : enrollment.users;
    const metadata = enrollment.metadata || {};
    
    const studentRecord: StudentRecord = {
      id: enrollment.id,
      first_name: metadata.first_name || "",
      last_name: metadata.last_name || "",
      email: user?.email || null,
      student_id: metadata.student_id || null,
      grade_level: metadata.grade_level || null,
      learning_style: metadata.learning_style || null,
      assessment_score: metadata.assessment_score || null,
      enrollment_date: metadata.enrollment_date || enrollment.enrolled_at?.slice(0, 10) || null,
      notes: metadata.notes || null,
      course_id: enrollment.course_id,
      created_by: metadata.created_by || null,
      synced_at: metadata.synced_at || null,
    };

    return { data: studentRecord, error: null };
  }

  public async deleteStudent(studentId: string): Promise<RepositoryResult<null>> {
    if (!this.courseId || !studentId) {
      return { data: null, error: { message: "Course ID and Student ID are required" } as unknown as any };
    }

    // Always use new schema (enrollments)
    // Check if metadata column exists
    const { error: metadataCheckError } = await supabase
      .from("enrollments")
      .select("metadata")
      .limit(1);

    if (metadataCheckError && metadataCheckError.code === '42703' && metadataCheckError.message?.includes('metadata')) {
      console.error('❌ Database migrations not run: enrollments.metadata column does not exist');
      return { 
        data: null, 
        error: {
          ...metadataCheckError,
          message: 'Database schema not up to date. Please run migrations.'
        } as any
      };
    }

    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("id", studentId)
      .eq("course_id", this.courseId);

    return { data: null, error };
  }

  private async resolveCurrentUserId(): Promise<string | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      return user?.id ?? null;
    } catch (error) {
      console.warn("Unable to resolve current user for student inserts:", error);
      return null;
    }
  }
}

