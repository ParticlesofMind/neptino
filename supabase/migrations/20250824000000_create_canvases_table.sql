-- Create canvases table for storing lesson canvases
-- Each lesson can have multiple canvases, starting with 1 canvas per lesson

CREATE TABLE canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL, -- 1 to course_sessions
  canvas_index INTEGER NOT NULL DEFAULT 1, -- 1, 2, 3... for multiple canvases per lesson
  canvas_data JSONB, -- PIXI scene data, drawing data, objects, etc.
  canvas_metadata JSONB, -- title, description, canvas type, settings, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_canvases_course_lesson ON canvases(course_id, lesson_number);
CREATE UNIQUE INDEX idx_canvases_unique ON canvases(course_id, lesson_number, canvas_index);
CREATE INDEX idx_canvases_course ON canvases(course_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

-- Users can only access canvases for courses they have access to
CREATE POLICY "Users can view canvases for their courses" ON canvases
  FOR SELECT USING (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
      UNION
      SELECT course_id FROM enrollments WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert canvases for their courses" ON canvases
  FOR INSERT WITH CHECK (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Users can update canvases for their courses" ON canvases
  FOR UPDATE USING (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete canvases for their courses" ON canvases
  FOR DELETE USING (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

-- Add function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_canvases_updated_at 
  BEFORE UPDATE ON canvases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE canvases IS 'Stores canvas data for course lessons. Each lesson can have multiple canvases for different activities or pages.';
COMMENT ON COLUMN canvases.lesson_number IS 'The lesson number within the course (1 to course_sessions)';
COMMENT ON COLUMN canvases.canvas_index IS 'The canvas number within the lesson (1, 2, 3, etc.)';
COMMENT ON COLUMN canvases.canvas_data IS 'PIXI.js scene data, drawing objects, shapes, text, etc.';
COMMENT ON COLUMN canvases.canvas_metadata IS 'Canvas settings, title, description, layout info, etc.';
