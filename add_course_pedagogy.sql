-- Migration: Add course_pedagogy column to courses table
-- Safe to run multiple times

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS course_pedagogy text;

