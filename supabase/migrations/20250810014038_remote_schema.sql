revoke delete on table "public"."courses" from "anon";

revoke insert on table "public"."courses" from "anon";

revoke references on table "public"."courses" from "anon";

revoke select on table "public"."courses" from "anon";

revoke trigger on table "public"."courses" from "anon";

revoke truncate on table "public"."courses" from "anon";

revoke update on table "public"."courses" from "anon";

revoke delete on table "public"."courses" from "authenticated";

revoke insert on table "public"."courses" from "authenticated";

revoke references on table "public"."courses" from "authenticated";

revoke select on table "public"."courses" from "authenticated";

revoke trigger on table "public"."courses" from "authenticated";

revoke truncate on table "public"."courses" from "authenticated";

revoke update on table "public"."courses" from "authenticated";

revoke delete on table "public"."courses" from "service_role";

revoke insert on table "public"."courses" from "service_role";

revoke references on table "public"."courses" from "service_role";

revoke select on table "public"."courses" from "service_role";

revoke trigger on table "public"."courses" from "service_role";

revoke truncate on table "public"."courses" from "service_role";

revoke update on table "public"."courses" from "service_role";

revoke delete on table "public"."lesson_templates" from "anon";

revoke insert on table "public"."lesson_templates" from "anon";

revoke references on table "public"."lesson_templates" from "anon";

revoke select on table "public"."lesson_templates" from "anon";

revoke trigger on table "public"."lesson_templates" from "anon";

revoke truncate on table "public"."lesson_templates" from "anon";

revoke update on table "public"."lesson_templates" from "anon";

revoke delete on table "public"."lesson_templates" from "authenticated";

revoke insert on table "public"."lesson_templates" from "authenticated";

revoke references on table "public"."lesson_templates" from "authenticated";

revoke select on table "public"."lesson_templates" from "authenticated";

revoke trigger on table "public"."lesson_templates" from "authenticated";

revoke truncate on table "public"."lesson_templates" from "authenticated";

revoke update on table "public"."lesson_templates" from "authenticated";

revoke delete on table "public"."lesson_templates" from "service_role";

revoke insert on table "public"."lesson_templates" from "service_role";

revoke references on table "public"."lesson_templates" from "service_role";

revoke select on table "public"."lesson_templates" from "service_role";

revoke trigger on table "public"."lesson_templates" from "service_role";

revoke truncate on table "public"."lesson_templates" from "service_role";

revoke update on table "public"."lesson_templates" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

alter table "public"."courses" alter column "id" set default extensions.uuid_generate_v4();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id uuid, user_email text, user_role text DEFAULT 'teacher'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- This function runs with elevated privileges (SECURITY DEFINER)
  -- so it can bypass RLS policies
  INSERT INTO public.users (id, first_name, last_name, email, role, institution)
  VALUES (
    user_id,
    COALESCE(NULLIF(split_part(user_email, '@', 1), ''), 'User'),
    '',
    user_email,
    user_role,
    'Independent'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Create user profile when a new user is created in auth.users
  INSERT INTO public.users (id, first_name, last_name, email, role, institution)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'User')),
    '',
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'user_role', ''), 'teacher'),
    'Independent'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;


