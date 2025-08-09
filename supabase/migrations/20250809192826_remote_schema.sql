

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'teacher',
    'student',
    'administrator'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_name" "text" NOT NULL,
    "course_description" "text",
    "teacher_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "canvas_count" integer DEFAULT 1,
    "course_image" "text",
    "schedule_settings" "jsonb",
    "schedule_events" "jsonb",
    "template_id" "uuid",
    "lesson_days_count" integer DEFAULT 1,
    "classification_data" "jsonb",
    CONSTRAINT "courses_canvas_count_check" CHECK ((("canvas_count" >= 1) AND ("canvas_count" <= 50)))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."courses"."classification_data" IS 'JSON object containing course classification data (ISCED-F 2013, educational level, framework, approaches, and custom tags)';



CREATE TABLE IF NOT EXISTS "public"."lesson_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_name" character varying(255) NOT NULL,
    "template_description" "text",
    "template_data" "jsonb" NOT NULL,
    "template_thumbnail" "jsonb",
    "teacher_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_template_name_length" CHECK ((("length"(("template_name")::"text") >= 1) AND ("length"(("template_name")::"text") <= 255)))
);


ALTER TABLE "public"."lesson_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."lesson_templates" IS 'Stores reusable lesson templates created by teachers';



COMMENT ON COLUMN "public"."lesson_templates"."template_data" IS 'JSON object containing the complete template structure and configuration';



COMMENT ON COLUMN "public"."lesson_templates"."template_thumbnail" IS 'JSON object containing thumbnail data for template preview';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text",
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['teacher'::"text", 'student'::"text", 'administrator'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_templates"
    ADD CONSTRAINT "lesson_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_courses_classification_data" ON "public"."courses" USING "gin" ("classification_data");



CREATE INDEX "idx_courses_template_id" ON "public"."courses" USING "btree" ("template_id");



CREATE INDEX "idx_lesson_templates_created_at" ON "public"."lesson_templates" USING "btree" ("created_at");



CREATE INDEX "idx_lesson_templates_teacher_id" ON "public"."lesson_templates" USING "btree" ("teacher_id");



CREATE INDEX "idx_lesson_templates_template_name" ON "public"."lesson_templates" USING "btree" ("template_name");



CREATE OR REPLACE TRIGGER "update_lesson_templates_updated_at" BEFORE UPDATE ON "public"."lesson_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."lesson_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lesson_templates"
    ADD CONSTRAINT "lesson_templates_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Teachers may insert their own courses" ON "public"."courses" FOR INSERT WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers may read their own courses" ON "public"."courses" FOR SELECT USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can delete own templates" ON "public"."lesson_templates" FOR DELETE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can insert own templates" ON "public"."lesson_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can insert their own data" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own templates" ON "public"."lesson_templates" FOR UPDATE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can view own templates" ON "public"."lesson_templates" FOR SELECT USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can view their own data" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."lesson_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."courses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."users";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



























GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_templates" TO "anon";
GRANT ALL ON TABLE "public"."lesson_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_templates" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
