-- Atlas source feedback
--
-- Teacher and reviewer judgment lives beside source records instead of
-- overwriting the imported source evidence. This lets Atlas improve source
-- ranking and generated card quality over time while keeping provenance intact.

CREATE TABLE IF NOT EXISTS public.atlas_source_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id uuid NOT NULL REFERENCES public.atlas_source_records(id) ON DELETE CASCADE,
  candidate_kind text
    CHECK (
      candidate_kind IS NULL OR candidate_kind IN (
        'entity',
        'asset',
        'product',
        'task',
        'pack',
        'card',
        'composition'
      )
    ),
  candidate_id text,
  teacher_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  rating numeric(2,1)
    CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  accuracy_rating numeric(2,1)
    CHECK (accuracy_rating IS NULL OR accuracy_rating BETWEEN 1 AND 5),
  visual_quality_rating numeric(2,1)
    CHECK (visual_quality_rating IS NULL OR visual_quality_rating BETWEEN 1 AND 5),
  classroom_fit_rating numeric(2,1)
    CHECK (classroom_fit_rating IS NULL OR classroom_fit_rating BETWEEN 1 AND 5),
  review_status text NOT NULL DEFAULT 'teacher-reviewed'
    CHECK (review_status IN ('teacher-reviewed', 'disputed', 'approved', 'rejected')),
  rejection_reason text
    CHECK (
      rejection_reason IS NULL OR rejection_reason IN (
        'irrelevant',
        'misleading',
        'outdated',
        'rights_issue',
        'low_quality',
        'duplicate',
        'other'
      )
    ),
  note text,
  correction_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atlas_source_feedback_source_record
  ON public.atlas_source_feedback(source_record_id, review_status);

CREATE INDEX IF NOT EXISTS idx_atlas_source_feedback_teacher
  ON public.atlas_source_feedback(teacher_id, created_at DESC)
  WHERE teacher_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atlas_source_feedback_candidate
  ON public.atlas_source_feedback(candidate_kind, candidate_id)
  WHERE candidate_kind IS NOT NULL AND candidate_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atlas_source_feedback_corrections
  ON public.atlas_source_feedback(review_status, created_at DESC)
  WHERE review_status IN ('disputed', 'rejected');

DROP TRIGGER IF EXISTS set_updated_at ON public.atlas_source_feedback;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.atlas_source_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.atlas_source_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS atlas_source_feedback_self_or_admin_read ON public.atlas_source_feedback;
CREATE POLICY atlas_source_feedback_self_or_admin_read ON public.atlas_source_feedback
  FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS atlas_source_feedback_teacher_insert ON public.atlas_source_feedback;
CREATE POLICY atlas_source_feedback_teacher_insert ON public.atlas_source_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      teacher_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.users
        WHERE users.id = auth.uid()
          AND users.role IN ('teacher', 'admin')
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS atlas_source_feedback_self_or_admin_update ON public.atlas_source_feedback;
CREATE POLICY atlas_source_feedback_self_or_admin_update ON public.atlas_source_feedback
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS atlas_source_feedback_self_or_admin_delete ON public.atlas_source_feedback;
CREATE POLICY atlas_source_feedback_self_or_admin_delete ON public.atlas_source_feedback
  FOR DELETE
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

REVOKE ALL ON public.atlas_source_feedback FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atlas_source_feedback TO authenticated;
GRANT ALL ON public.atlas_source_feedback TO service_role;

COMMENT ON TABLE public.atlas_source_feedback IS
  'Teacher and reviewer feedback against Atlas source records and generated card or composition surfaces.';

COMMENT ON COLUMN public.atlas_source_feedback.source_record_id IS
  'Raw Atlas source record being evaluated.';

COMMENT ON COLUMN public.atlas_source_feedback.candidate_kind IS
  'Optional generated surface type linked to this feedback, such as product, task, card, or composition.';

COMMENT ON COLUMN public.atlas_source_feedback.correction_payload IS
  'Structured correction, replacement geometry, claim patch, or source-quality note supplied by a reviewer.';
