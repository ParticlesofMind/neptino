/**
 * Course Statistics and Data Management Utilities
 * 
 * This module provides functions to fetch course data with calculated statistics
 * including student enrollment count, lesson count, and other metrics.
 */

import { supabase } from '../backend/supabase';
import { getCourseId } from './courseId';

export interface CourseWithStats {
  id: string;
  course_name: string;
  course_description: string;
  course_image?: string;
  course_language: string;
  course_sessions?: number;
  teacher_id: string;
  institution?: string;
  created_at: string;
  updated_at: string;
  
  // Calculated statistics
  student_count: number;
  lesson_count: number;
  schedule_sessions: number;
  status: 'draft' | 'active' | 'completed';
}

export interface CourseStatistics {
  student_count: number;
  lesson_count: number;
  schedule_sessions: number;
  status: 'draft' | 'active' | 'completed';
}

/**
 * Get comprehensive course data with statistics
 * @param courseId Course ID to fetch data for
 * @returns Promise that resolves to course with statistics or null
 */
export async function getCourseWithStats(courseId: string): Promise<CourseWithStats | null> {
  try {
    // Fetch basic course data
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      return null;
    }

    if (!courseData) {
      return null;
    }

    // Fetch statistics
    const stats = await getCourseStatistics(courseId);

    // Combine course data with statistics
    const courseWithStats: CourseWithStats = {
      ...courseData,
      ...stats,
    };

    return courseWithStats;
  } catch (error) {
    return null;
  }
}

/**
 * Calculate course statistics
 * @param courseId Course ID to calculate statistics for
 * @returns Promise that resolves to course statistics
 */
export async function getCourseStatistics(courseId: string): Promise<CourseStatistics> {
  try {
    // Get student enrollment count
    const { count: studentCount, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'active');

    // Get course data to check for schedule sessions
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('course_sessions, schedule_settings')
      .eq('id', courseId)
      .single();

    let scheduleSessions = 0;
    if (courseData?.course_sessions) {
      scheduleSessions = courseData.course_sessions;
    } else if (courseData?.schedule_settings) {
      // Try to calculate from schedule_settings JSON
      try {
        const scheduleData = courseData.schedule_settings;
        if (Array.isArray(scheduleData)) {
          scheduleSessions = scheduleData.length;
        } else if (typeof scheduleData === 'object' && scheduleData !== null) {
          // If schedule_settings is an object, try to find session count
          scheduleSessions = (scheduleData as any).sessions?.length || 0;
        }
      }
    }

    // Determine course status based on available data
    let status: 'draft' | 'active' | 'completed' = 'draft';

    if (scheduleSessions > 0 && (studentCount || 0) > 0) {
      status = 'active';
    } else if (scheduleSessions > 0) {
      // Course has schedule but no students yet - still considered draft
      status = 'draft';
    }

    return {
      student_count: studentCount || 0,
      lesson_count: scheduleSessions, // Using schedule sessions as lesson count for now
      schedule_sessions: scheduleSessions,
      status,
    };
  } catch (error) {
    return {
      student_count: 0,
      lesson_count: 0,
      schedule_sessions: 0,
      status: 'draft',
    };
  }
}

/**
 * Get course data for the current page's courseId (if available)
 * This is useful for course detail pages that have courseId in URL
 * @returns Promise that resolves to course with statistics or null
 */
export async function getCurrentPageCourseWithStats(): Promise<CourseWithStats | null> {
  const courseId = getCourseId();
  
  if (!courseId) {
    return null;
  }

  return getCourseWithStats(courseId);
}

/**
 * Format course status for display
 * @param status Course status
 * @returns Formatted status string
 */
export function formatCourseStatus(status: 'draft' | 'active' | 'completed'): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    default:
      return 'Draft';
  }
}

/**
 * Get appropriate status CSS class
 * @param status Course status
 * @returns CSS class name for the status
 */
export function getStatusClassName(status: 'draft' | 'active' | 'completed'): string {
  switch (status) {
    case 'draft':
      return 'course-card__status--draft';
    case 'active':
      return 'course-card__status--active';
    case 'completed':
      return 'course-card__status--completed';
    default:
      return 'course-card__status--draft';
  }
}
