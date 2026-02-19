-- Migration: Add course_pedagogy column to courses table
-- Created: 2025-09-14
-- Description: Adds course_pedagogy text column to store selected pedagogy method

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS course_pedagogy text;