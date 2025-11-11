// ==========================================================================
// COURSE FORM CONFIGURATION - Field definitions and section configs
// ==========================================================================

// ==========================================================================
// TYPES & INTERFACES
// ==========================================================================

export interface FormFieldConfig {
 name: string;
 type:
 | "text"
 | "textarea"
 | "select"
 | "file"
 | "number"
 | "date"
 | "time"
 | "display"
 | "checkbox";
 required?: boolean;
 minLength?: number;
 maxLength?: number;
 pattern?: RegExp;
 accept?: string; // for file inputs
 options?: string[]; // for select dropdowns
 displayFunction?: () => Promise<string>; // for display fields
 loadDynamically?: boolean; // for fields that need dynamic loading
}

export interface SectionConfig {
 section: string;
 requiredFields: string[];
 jsonbField?: string; // Store in classification_data, schedule_settings, etc.
 fields: FormFieldConfig[];
 submitLabel?: string;
 autoSave?: boolean;
}

export interface ValidationState {
 [fieldName: string]: boolean;
}

// ==========================================================================
// DYNAMIC FIELD FUNCTIONS
// ==========================================================================

import { supabase } from "../../supabase";

export const displayFunctions = {
 async getTeacherName(): Promise<string> {
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (user) {
 const { data: profile } = await supabase
 .from("users")
 .select("first_name, last_name")
 .eq("id", user.id)
 .single();
 return profile
 ? `${profile.first_name} ${profile.last_name}`
 : "Unknown Teacher";
 }
 return "Unknown Teacher";
 },

 async getInstitution(): Promise<string> {
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (user) {
 const { data: profile } = await supabase
 .from("users")
 .select("institution")
 .eq("id", user.id)
 .single();
 return profile?.institution || "Independent";
 }
 return "Independent";
 },
};

// ==========================================================================
// SECTION CONFIGURATIONS
// ==========================================================================

export const SECTION_CONFIGS: { [key: string]: SectionConfig } = {
 essentials: {
 section: "essentials",
 requiredFields: [
 "course_name",
 "course_description",
 "teacher_id",
 "institution",
 "course_language",
 "course_type",
 "course_image",
 ],
 fields: [
 { name: "course_name", type: "text", required: true, minLength: 3 },
 {
 name: "course_description",
 type: "textarea",
 required: true,
 minLength: 10,
 },
    {
      name: "teacher_id",
      type: "select",
      required: true,
      loadDynamically: true, // Signal that this should be loaded dynamically
    },
    {
      name: "institution",
      type: "select",
      required: true,
      loadDynamically: true, // Signal that this should be loaded dynamically
    },
 {
 name: "course_language",
 type: "select",
 required: true,
 loadDynamically: true, // Signal that this should be loaded dynamically
 },
 {
 name: "course_type",
 type: "select",
 required: true,
 options: ["In-person", "Online", "Hybrid"],
 },
 { name: "course_image", type: "file", required: true, accept: "image/*" },
 ],
 submitLabel: "Create Course",
 autoSave: false,
 },

 classification: {
 section: "classification",
 requiredFields: ["class_year", "domain", "subject"],
 jsonbField: "classification_data",
 fields: [
 {
 name: "class_year",
 type: "select",
 required: true,
 options: [
 "Year 1",
 "Year 2",
 "Year 3",
 "Year 4",
 "Year 5",
 "Year 6",
 "Year 7",
 "Year 8",
 "Year 9",
 "Year 10",
 "Year 11",
 "Year 12",
 "Undergraduate",
 "Graduate",
 "Postgraduate",
 ],
 },
 {
 name: "curricular_framework",
 type: "select",
 required: false,
 options: [
 "National Curriculum",
 "International Baccalaureate",
 "Cambridge International",
 "Advanced Placement",
 "Custom Framework",
 "Other",
 ],
 },
 { name: "domain", type: "text", required: true },
 { name: "subject", type: "text", required: true },
 { name: "topic", type: "text", required: false },
 { name: "subtopic", type: "text", required: false },
 { name: "previous_course", type: "text", required: false },
 { name: "current_course", type: "text", required: false },
 { name: "next_course", type: "text", required: false },
 ],
 autoSave: true,
 },

 templates: {
 section: "templates",
 requiredFields: ["template_type"],
 jsonbField: "template_settings",
 fields: [
 {
 name: "template_type",
 type: "select",
 required: true,
 options: [
 "programming",
 "mathematics",
 "science",
 "language",
 "custom",
 ],
 },
 {
 name: "template_style",
 type: "select",
 required: false,
 options: ["modern", "classic", "minimal", "colorful"],
 },
 ],
 autoSave: true,
 },

 schedule: {
 section: "schedule",
 requiredFields: ["start_date", "schedule_type"],
 jsonbField: "schedule_settings",
 fields: [
 { name: "start_date", type: "date", required: true },
 { name: "end_date", type: "date", required: false },
 {
 name: "schedule_type",
 type: "select",
 required: true,
 options: ["weekly", "bi-weekly", "daily", "custom"],
 },
 { name: "class_time", type: "time", required: false },
 { name: "class_duration", type: "number", required: false },
 ],
 autoSave: true,
 },

 curriculum: {
 section: "curriculum",
 requiredFields: ["curriculum_approach"],
 jsonbField: "curriculum_data",
 fields: [
 {
 name: "curriculum_approach",
 type: "select",
 required: true,
 options: ["modular", "linear", "spiral", "project-based"],
 },
 { name: "learning_objectives", type: "textarea", required: false },
 { name: "assessment_methods", type: "textarea", required: false },
 { name: "required_materials", type: "textarea", required: false },
 ],
 autoSave: true,
 },

  "course-visibility": {
    section: "course-visibility",
    requiredFields: [],
    jsonbField: "visibility_settings",
    fields: [
      { name: "course_visible", type: "checkbox", required: false },
      { name: "allow_enrollment", type: "checkbox", required: false },
      { name: "require_approval", type: "checkbox", required: false },
      { name: "enable_notifications", type: "checkbox", required: false },
      { name: "public_course", type: "checkbox", required: false },
    ],
    autoSave: true,
  },
  pedagogy: {
    section: "pedagogy",
    requiredFields: ["course_pedagogy"],
    // Stored as a top-level column in courses
    fields: [
      { name: "course_pedagogy", type: "text", required: true },
    ],
    autoSave: true,
  },
  marketplace: {
    section: "marketplace",
    requiredFields: ["listing_status"],
    jsonbField: "marketplace_settings",
    fields: [
      {
        name: "listing_status",
        type: "select",
        required: true,
        options: ["draft", "pending", "published"],
      },
      { name: "target_audience", type: "text", required: false },
      { name: "revenue_share", type: "number", required: false },
      { name: "distribution_channels", type: "textarea", required: false },
    ],
    autoSave: true,
  },
  resources: {
    section: "resources",
    requiredFields: [],
    jsonbField: "resources_settings",
    fields: [
      { name: "resource_policy", type: "textarea", required: false },
      {
        name: "allow_student_uploads",
        type: "checkbox",
        required: false,
      },
      {
        name: "default_storage_provider",
        type: "select",
        required: false,
        options: ["internal", "google-drive", "dropbox"],
      },
      { name: "featured_resources", type: "text", required: false },
    ],
    autoSave: true,
  },
  "pricing-monetization": {
    section: "pricing-monetization",
    requiredFields: [],
    jsonbField: "pricing_settings",
    fields: [
      {
        name: "pricing_model",
        type: "select",
        required: false,
        options: ["free", "subscription", "one-time", "license"],
      },
      { name: "base_price", type: "number", required: false },
      {
        name: "currency",
        type: "select",
        required: false,
        options: ["USD", "EUR", "GBP"],
      },
      { name: "trial_available", type: "checkbox", required: false },
      { name: "discount_notes", type: "textarea", required: false },
    ],
    autoSave: true,
  },
  "external-integrations": {
    section: "external-integrations",
    requiredFields: [],
    jsonbField: "integration_settings",
    fields: [
      {
        name: "lms_provider",
        type: "select",
        required: false,
        options: ["None", "Canvas", "Moodle", "Schoology"],
      },
      { name: "api_access", type: "checkbox", required: false },
      { name: "webhook_url", type: "text", required: false },
      { name: "integration_notes", type: "textarea", required: false },
    ],
    autoSave: true,
  },
  communication: {
    section: "communication",
    requiredFields: [],
    jsonbField: "communication_settings",
    fields: [
      { name: "welcome_message", type: "textarea", required: false },
      {
        name: "announcement_channel",
        type: "select",
        required: false,
        options: ["email", "in-app", "sms"],
      },
      { name: "enable_updates", type: "checkbox", required: false },
      { name: "office_hours", type: "text", required: false },
    ],
    autoSave: true,
  },
};

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

export function getSectionConfig(sectionName: string): SectionConfig | null {
 return SECTION_CONFIGS[sectionName] || null;
}

export function getFieldConfig(
 sectionName: string,
 fieldName: string,
): FormFieldConfig | null {
 const sectionConfig = getSectionConfig(sectionName);
 if (!sectionConfig) return null;

 return sectionConfig.fields.find((field) => field.name === fieldName) || null;
}

export function getRequiredFields(sectionName: string): string[] {
 const sectionConfig = getSectionConfig(sectionName);
 return sectionConfig?.requiredFields || [];
}

export function isAutoSaveSection(sectionName: string): boolean {
 const sectionConfig = getSectionConfig(sectionName);
 return sectionConfig?.autoSave || false;
}
