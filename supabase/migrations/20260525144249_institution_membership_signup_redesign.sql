-- Institution membership and intent-based signup foundation.
-- Keeps public.users.role/public.users.institution as transitional compatibility fields.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  institution_type text NOT NULL DEFAULT 'other',
  legal_name text,
  brand_name text,
  website_url text,
  logo_url text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institutions_type_check CHECK (
    institution_type IN (
      'independent',
      'private_school',
      'public_school',
      'higher_education',
      'tutoring_center',
      'training_provider',
      'nonprofit',
      'company',
      'other'
    )
  )
);

CREATE TABLE IF NOT EXISTS public.institution_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institution_memberships_role_check CHECK (role IN ('owner', 'admin', 'teacher', 'student')),
  CONSTRAINT institution_memberships_status_check CHECK (status IN ('invited', 'active', 'suspended', 'left', 'removed')),
  CONSTRAINT institution_memberships_unique_role UNIQUE (institution_id, user_id, role)
);

CREATE TABLE IF NOT EXISTS public.institution_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  accepted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institution_invites_role_check CHECK (role IN ('owner', 'admin', 'teacher', 'student')),
  CONSTRAINT institution_invites_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_label text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sequence_index integer NOT NULL,
  required boolean NOT NULL DEFAULT true,
  CONSTRAINT program_courses_unique_course UNIQUE (program_id, course_id),
  CONSTRAINT program_courses_unique_sequence UNIQUE (program_id, sequence_index)
);

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_institutions_created_by ON public.institutions(created_by);
CREATE INDEX IF NOT EXISTS idx_institution_memberships_user ON public.institution_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_institution_memberships_institution ON public.institution_memberships(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_memberships_active_user
  ON public.institution_memberships(user_id, status)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_institution_invites_email_status
  ON public.institution_invites(lower(email), status);
CREATE INDEX IF NOT EXISTS idx_programs_institution ON public.programs(institution_id);
CREATE INDEX IF NOT EXISTS idx_program_courses_program ON public.program_courses(program_id);
CREATE INDEX IF NOT EXISTS idx_program_courses_course ON public.program_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_institution_id ON public.courses(institution_id);

CREATE OR REPLACE FUNCTION app_private.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS institutions_touch_updated_at ON public.institutions;
CREATE TRIGGER institutions_touch_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS institution_memberships_touch_updated_at ON public.institution_memberships;
CREATE TRIGGER institution_memberships_touch_updated_at
  BEFORE UPDATE ON public.institution_memberships
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS institution_invites_touch_updated_at ON public.institution_invites;
CREATE TRIGGER institution_invites_touch_updated_at
  BEFORE UPDATE ON public.institution_invites
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS programs_touch_updated_at ON public.programs;
CREATE TRIGGER programs_touch_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

CREATE OR REPLACE FUNCTION app_private.slugify(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      regexp_replace(
        regexp_replace(lower(trim(COALESCE(value, ''))), '[^a-z0-9]+', '-', 'g'),
        '(^-|-$)',
        '',
        'g'
      ),
      ''
    ),
    'institution'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.next_institution_slug(value text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text := app_private.slugify(value);
  candidate text := base_slug;
  suffix integer := 2;
BEGIN
  WHILE EXISTS (SELECT 1 FROM public.institutions WHERE slug = candidate) LOOP
    candidate := base_slug || '-' || suffix::text;
    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.has_institution_role(
  institution_uuid uuid,
  allowed_roles text[]
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_memberships im
    WHERE im.institution_id = institution_uuid
      AND im.user_id = auth.uid()
      AND im.status = 'active'
      AND im.role = ANY(allowed_roles)
  );
$$;

CREATE OR REPLACE FUNCTION app_private.user_has_institution_role(
  target_user_id uuid,
  institution_uuid uuid,
  allowed_roles text[]
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_memberships im
    WHERE im.institution_id = institution_uuid
      AND im.user_id = target_user_id
      AND im.status = 'active'
      AND im.role = ANY(allowed_roles)
  );
$$;

CREATE OR REPLACE FUNCTION app_private.legacy_role_for_user(target_user_id uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.institution_memberships
      WHERE user_id = target_user_id AND status = 'active' AND role IN ('owner', 'admin')
    ) THEN 'admin'::public.user_role
    WHEN EXISTS (
      SELECT 1 FROM public.institution_memberships
      WHERE user_id = target_user_id AND status = 'active' AND role = 'teacher'
    ) THEN 'teacher'::public.user_role
    ELSE 'student'::public.user_role
  END;
$$;

CREATE OR REPLACE FUNCTION app_private.default_institution_name_for_user(target_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT i.name
  FROM public.institution_memberships im
  JOIN public.institutions i ON i.id = im.institution_id
  WHERE im.user_id = target_user_id
    AND im.status = 'active'
  ORDER BY
    CASE im.role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'teacher' THEN 3
      ELSE 4
    END,
    im.created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.refresh_legacy_user_fields(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
SET row_security = off
AS $$
BEGIN
  UPDATE public.users
  SET
    role = app_private.legacy_role_for_user(target_user_id),
    institution = COALESCE(app_private.default_institution_name_for_user(target_user_id), institution),
    updated_at = now()
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION app_private.has_institution_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.user_has_institution_role(uuid, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.legacy_role_for_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.default_institution_name_for_user(uuid) TO authenticated, service_role;

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_courses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.institutions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.institution_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.institution_invites FORCE ROW LEVEL SECURITY;
ALTER TABLE public.programs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.program_courses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS institutions_member_select ON public.institutions;
CREATE POLICY institutions_member_select ON public.institutions
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR app_private.has_institution_role(id, ARRAY['owner', 'admin', 'teacher', 'student'])
  );

DROP POLICY IF EXISTS institutions_self_insert ON public.institutions;
CREATE POLICY institutions_self_insert ON public.institutions
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS institutions_admin_update ON public.institutions;
CREATE POLICY institutions_admin_update ON public.institutions
  FOR UPDATE
  TO authenticated
  USING (app_private.has_institution_role(id, ARRAY['owner', 'admin']))
  WITH CHECK (app_private.has_institution_role(id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS memberships_visible_to_self_or_admin ON public.institution_memberships;
CREATE POLICY memberships_visible_to_self_or_admin ON public.institution_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR app_private.has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );

DROP POLICY IF EXISTS memberships_admin_insert ON public.institution_memberships;
CREATE POLICY memberships_admin_insert ON public.institution_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    app_private.has_institution_role(institution_id, ARRAY['owner', 'admin'])
    OR (
      user_id = auth.uid()
      AND role = 'student'
      AND status = 'active'
      AND EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.institution_id = institution_memberships.institution_id
          AND c.visibility_settings @> '{"visible": true, "enrollment": true}'::jsonb
      )
    )
  );

DROP POLICY IF EXISTS memberships_admin_update ON public.institution_memberships;
CREATE POLICY memberships_admin_update ON public.institution_memberships
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR app_private.has_institution_role(institution_id, ARRAY['owner', 'admin'])
  )
  WITH CHECK (
    user_id = auth.uid()
    OR app_private.has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );

DROP POLICY IF EXISTS programs_member_select ON public.programs;
CREATE POLICY programs_member_select ON public.programs
  FOR SELECT
  TO authenticated
  USING (app_private.has_institution_role(institution_id, ARRAY['owner', 'admin', 'teacher', 'student']));

DROP POLICY IF EXISTS programs_staff_write ON public.programs;
CREATE POLICY programs_staff_write ON public.programs
  FOR ALL
  TO authenticated
  USING (app_private.has_institution_role(institution_id, ARRAY['owner', 'admin', 'teacher']))
  WITH CHECK (app_private.has_institution_role(institution_id, ARRAY['owner', 'admin', 'teacher']));

DROP POLICY IF EXISTS program_courses_member_select ON public.program_courses;
CREATE POLICY program_courses_member_select ON public.program_courses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = program_courses.program_id
        AND app_private.has_institution_role(p.institution_id, ARRAY['owner', 'admin', 'teacher', 'student'])
    )
  );

DROP POLICY IF EXISTS program_courses_staff_write ON public.program_courses;
CREATE POLICY program_courses_staff_write ON public.program_courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = program_courses.program_id
        AND app_private.has_institution_role(p.institution_id, ARRAY['owner', 'admin', 'teacher'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = program_courses.program_id
        AND app_private.has_institution_role(p.institution_id, ARRAY['owner', 'admin', 'teacher'])
    )
  );

REVOKE ALL ON public.institution_invites FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.institutions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.institution_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_courses TO authenticated;
GRANT ALL ON public.institutions TO service_role;
GRANT ALL ON public.institution_memberships TO service_role;
GRANT ALL ON public.institution_invites TO service_role;
GRANT ALL ON public.programs TO service_role;
GRANT ALL ON public.program_courses TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

DO $$
DECLARE
  legacy record;
  inst_id uuid;
  inst_name text;
  membership_role text;
BEGIN
  FOR legacy IN
    SELECT DISTINCT trim(institution) AS name
    FROM public.users
    WHERE institution IS NOT NULL
      AND trim(institution) <> ''
      AND lower(trim(institution)) <> 'independent'
    ORDER BY trim(institution)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE lower(name) = lower(legacy.name)) THEN
      INSERT INTO public.institutions (name, slug, institution_type, created_at, updated_at)
      VALUES (legacy.name, app_private.next_institution_slug(legacy.name), 'other', now(), now());
    END IF;
  END LOOP;

  FOR legacy IN
    SELECT id, email, first_name, last_name, role, institution
    FROM public.users
    WHERE role IN ('teacher', 'admin')
      AND (
        institution IS NULL
        OR trim(institution) = ''
        OR lower(trim(institution)) = 'independent'
      )
    ORDER BY created_at, id
  LOOP
    inst_name := COALESCE(
      NULLIF(trim(concat_ws(' ', legacy.first_name, legacy.last_name)), '') || ' Studio',
      split_part(legacy.email, '@', 1) || ' Studio',
      'Independent Studio'
    );

    INSERT INTO public.institutions (name, slug, institution_type, created_by, created_at, updated_at)
    VALUES (inst_name, app_private.next_institution_slug(inst_name), 'independent', legacy.id, now(), now())
    RETURNING id INTO inst_id;

    INSERT INTO public.institution_memberships (institution_id, user_id, role, status, joined_at)
    VALUES
      (inst_id, legacy.id, 'owner', 'active', now()),
      (inst_id, legacy.id, 'admin', 'active', now())
    ON CONFLICT (institution_id, user_id, role) DO NOTHING;

    IF legacy.role = 'teacher' THEN
      INSERT INTO public.institution_memberships (institution_id, user_id, role, status, joined_at)
      VALUES (inst_id, legacy.id, 'teacher', 'active', now())
      ON CONFLICT (institution_id, user_id, role) DO NOTHING;
    END IF;

    UPDATE public.users
    SET institution = inst_name, updated_at = now()
    WHERE id = legacy.id;
  END LOOP;

  FOR legacy IN
    SELECT u.id, u.role, i.id AS institution_id, i.name AS institution_name
    FROM public.users u
    JOIN public.institutions i ON lower(i.name) = lower(trim(u.institution))
    WHERE u.institution IS NOT NULL
      AND trim(u.institution) <> ''
      AND lower(trim(u.institution)) <> 'independent'
  LOOP
    IF legacy.role = 'admin' THEN
      INSERT INTO public.institution_memberships (institution_id, user_id, role, status, joined_at)
      VALUES
        (legacy.institution_id, legacy.id, 'owner', 'active', now()),
        (legacy.institution_id, legacy.id, 'admin', 'active', now())
      ON CONFLICT (institution_id, user_id, role) DO NOTHING;
    ELSE
      membership_role := legacy.role::text;
      INSERT INTO public.institution_memberships (institution_id, user_id, role, status, joined_at)
      VALUES (legacy.institution_id, legacy.id, membership_role, 'active', now())
      ON CONFLICT (institution_id, user_id, role) DO NOTHING;
    END IF;

    UPDATE public.users
    SET institution = legacy.institution_name, updated_at = now()
    WHERE id = legacy.id;
  END LOOP;
END $$;

UPDATE public.courses c
SET institution_id = i.id
FROM public.institutions i
WHERE c.institution_id IS NULL
  AND c.institution IS NOT NULL
  AND trim(c.institution) <> ''
  AND lower(trim(c.institution)) <> 'independent'
  AND lower(i.name) = lower(trim(c.institution));

UPDATE public.courses c
SET
  institution_id = im.institution_id,
  institution = i.name
FROM public.institution_memberships im
JOIN public.institutions i ON i.id = im.institution_id
WHERE c.institution_id IS NULL
  AND c.teacher_id = im.user_id
  AND im.role = 'owner'
  AND im.status = 'active'
  AND (c.institution IS NULL OR trim(c.institution) = '' OR lower(trim(c.institution)) = 'independent');

DROP POLICY IF EXISTS courses_owner_all ON public.courses;
DROP POLICY IF EXISTS courses_student_view ON public.courses;
DROP POLICY IF EXISTS courses_member_select ON public.courses;
DROP POLICY IF EXISTS courses_staff_write ON public.courses;

CREATE POLICY courses_member_select ON public.courses
  FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_course_enrolled(id)
    OR (
      institution_id IS NOT NULL
      AND app_private.has_institution_role(institution_id, ARRAY['owner', 'admin', 'teacher'])
    )
  );

CREATE POLICY courses_staff_write ON public.courses
  FOR ALL
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR (
      institution_id IS NOT NULL
      AND app_private.has_institution_role(institution_id, ARRAY['owner', 'admin', 'teacher'])
    )
  )
  WITH CHECK (
    teacher_id = auth.uid()
    OR (
      institution_id IS NOT NULL
      AND app_private.has_institution_role(institution_id, ARRAY['owner', 'admin', 'teacher'])
    )
  );

CREATE OR REPLACE FUNCTION app_private.accept_pending_invite(
  target_user_id uuid,
  target_email text,
  invite_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
SET row_security = off
AS $$
DECLARE
  invite_row record;
BEGIN
  IF invite_token IS NULL OR trim(invite_token) = '' THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO invite_row
  FROM public.institution_invites
  WHERE token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
    AND lower(email) = lower(target_email)
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF invite_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.institution_memberships (
    institution_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at
  )
  VALUES (
    invite_row.institution_id,
    target_user_id,
    invite_row.role,
    'active',
    invite_row.invited_by,
    now()
  )
  ON CONFLICT (institution_id, user_id, role) DO UPDATE SET
    status = 'active',
    invited_by = COALESCE(EXCLUDED.invited_by, public.institution_memberships.invited_by),
    joined_at = COALESCE(public.institution_memberships.joined_at, EXCLUDED.joined_at),
    updated_at = now();

  UPDATE public.institution_invites
  SET
    status = 'accepted',
    accepted_by = target_user_id,
    accepted_at = now(),
    updated_at = now()
  WHERE id = invite_row.id;

  PERFORM app_private.refresh_legacy_user_fields(target_user_id);

  RETURN invite_row.institution_id;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
SET row_security = off
AS $$
DECLARE
  signup_intent text := NEW.raw_user_meta_data->>'signup_intent';
  requested_role text := NEW.raw_user_meta_data->>'user_role';
  first_name_value text := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  last_name_value text := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), '');
  requested_institution text := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'institution_name', '')), '');
  requested_type text := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'institution_type', '')), '');
  invite_token text := NEW.raw_user_meta_data->>'invite_token';
  valid_role public.user_role := 'student'::public.user_role;
  inst_id uuid;
  inst_name text;
BEGIN
  IF signup_intent = 'setup_institution' THEN
    valid_role := 'admin'::public.user_role;
  ELSIF signup_intent = 'create_courses' THEN
    valid_role := 'teacher'::public.user_role;
  ELSIF requested_role IN ('student', 'teacher', 'admin') THEN
    valid_role := requested_role::public.user_role;
  END IF;

  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(first_name_value, split_part(NEW.email, '@', 1)),
    COALESCE(last_name_value, ''),
    valid_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    role = EXCLUDED.role,
    updated_at = now();

  IF signup_intent = 'create_courses' THEN
    inst_name := COALESCE(
      requested_institution,
      NULLIF(trim(concat_ws(' ', first_name_value, last_name_value)), '') || ' Studio',
      split_part(NEW.email, '@', 1) || ' Studio'
    );

    INSERT INTO public.institutions (name, slug, institution_type, created_by)
    VALUES (inst_name, app_private.next_institution_slug(inst_name), 'independent', NEW.id)
    RETURNING id INTO inst_id;

    INSERT INTO public.institution_memberships (institution_id, user_id, role, status, joined_at)
    VALUES
      (inst_id, NEW.id, 'owner', 'active', now()),
      (inst_id, NEW.id, 'admin', 'active', now()),
      (inst_id, NEW.id, 'teacher', 'active', now())
    ON CONFLICT (institution_id, user_id, role) DO NOTHING;

    PERFORM app_private.refresh_legacy_user_fields(NEW.id);
  ELSIF signup_intent = 'setup_institution' THEN
    inst_name := COALESCE(requested_institution, split_part(NEW.email, '@', 1) || ' Organization');

    IF requested_type NOT IN (
      'independent',
      'private_school',
      'public_school',
      'higher_education',
      'tutoring_center',
      'training_provider',
      'nonprofit',
      'company',
      'other'
    ) THEN
      requested_type := 'other';
    END IF;

    INSERT INTO public.institutions (name, slug, institution_type, created_by)
    VALUES (inst_name, app_private.next_institution_slug(inst_name), requested_type, NEW.id)
    RETURNING id INTO inst_id;

    INSERT INTO public.institution_memberships (institution_id, user_id, role, status, joined_at)
    VALUES
      (inst_id, NEW.id, 'owner', 'active', now()),
      (inst_id, NEW.id, 'admin', 'active', now())
    ON CONFLICT (institution_id, user_id, role) DO NOTHING;

    PERFORM app_private.refresh_legacy_user_fields(NEW.id);
  END IF;

  PERFORM app_private.accept_pending_invite(NEW.id, NEW.email, invite_token);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION app_private.handle_new_user();

DROP FUNCTION IF EXISTS public.ensure_user_profile(uuid, text, text);

CREATE FUNCTION public.ensure_user_profile(
  p_user_id uuid,
  p_user_email text,
  p_user_role text DEFAULT 'teacher'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, app_private, pg_temp
SET row_security = off
AS $$
DECLARE
  valid_role public.user_role := 'teacher'::public.user_role;
  inst_id uuid;
  inst_name text;
BEGIN
  IF p_user_role IN ('student', 'teacher', 'admin') THEN
    valid_role := p_user_role::public.user_role;
  END IF;

  INSERT INTO public.users (id, email, role)
  VALUES (p_user_id, p_user_email, valid_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = COALESCE(public.users.role, EXCLUDED.role),
    updated_at = now();

  IF valid_role IN ('teacher', 'admin')
    AND NOT EXISTS (
      SELECT 1
      FROM public.institution_memberships
      WHERE institution_memberships.user_id = ensure_user_profile.p_user_id
        AND institution_memberships.status = 'active'
    )
  THEN
    inst_name := split_part(p_user_email, '@', 1) || ' Studio';
    INSERT INTO public.institutions (name, slug, institution_type, created_by)
    VALUES (inst_name, app_private.next_institution_slug(inst_name), 'independent', p_user_id)
    RETURNING id INTO inst_id;

    INSERT INTO public.institution_memberships (institution_id, user_id, role, status, joined_at)
    VALUES
      (inst_id, p_user_id, 'owner', 'active', now()),
      (inst_id, p_user_id, 'admin', 'active', now())
    ON CONFLICT (institution_id, user_id, role) DO NOTHING;

    IF valid_role = 'teacher' THEN
      INSERT INTO public.institution_memberships (institution_id, user_id, role, status, joined_at)
      VALUES (inst_id, p_user_id, 'teacher', 'active', now())
      ON CONFLICT (institution_id, user_id, role) DO NOTHING;
    END IF;

    PERFORM app_private.refresh_legacy_user_fields(p_user_id);
  END IF;
END;
$$;

COMMENT ON TABLE public.institutions IS 'Institutional workspaces and brand identity.';
COMMENT ON TABLE public.institution_memberships IS 'User roles within an institution. This is the long-term authorization source.';
COMMENT ON TABLE public.institution_invites IS 'Pending institution invitations anchored by email and accepted through hashed tokens.';
COMMENT ON COLUMN public.courses.institution_id IS 'Structured institution reference. Legacy courses.institution text remains during migration.';
COMMENT ON FUNCTION public.ensure_user_profile IS 'Ensures a user profile exists and provisions membership-based compatibility data without treating users.institution as the primary model.';
