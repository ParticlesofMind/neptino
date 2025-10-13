-- Migration: Add module support to curriculum_data structure
-- Created: 2025-10-13
-- Description: Documents the addition of module layer between courses and lessons
--              curriculum_data JSONB structure now supports:
--              {
--                "structure": {...},
--                "moduleOrganization": "linear" | "equal" | "tiered" | "custom",
--                "modules": [
--                  {
--                    "moduleNumber": 1,
--                    "title": "Module Title",
--                    "lessons": [...]
--                  }
--                ]
--              }
--
--              For backward compatibility, courses without moduleOrganization
--              will default to "linear" mode with a single implicit module.
--
--              New hierarchy: course > module > lesson > topic > objective > task

-- No schema changes needed - curriculum_data is already JSONB
-- This migration serves as documentation for the new structure

COMMENT ON COLUMN public.courses.curriculum_data IS 
'JSONB structure containing curriculum organization. Supports hierarchical structure: course > module > lesson > topic > objective > task. 
Module organization modes: linear (single list), equal (auto-distributed), tiered (intro/core/project), custom (user-defined).';
