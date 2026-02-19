import type { StudentProfile, StudentRecord } from "./studentsTypes.js";

function buildProfileTags(student: StudentRecord): string[] {
  const tags = new Set<string>();
  if (student.grade_level) {
    tags.add(`grade:${student.grade_level.toLowerCase().replace(/\s+/g, "-")}`);
  }
  if (student.learning_style?.length) {
    student.learning_style.forEach((style) =>
      tags.add(`learning-style:${style.toLowerCase().replace(/\s+/g, "-")}`),
    );
  }
  if (student.assessment_score !== null && student.assessment_score !== undefined) {
    if (student.assessment_score >= 90) {
      tags.add("assessment:advanced");
    } else if (student.assessment_score >= 75) {
      tags.add("assessment:proficient");
    } else if (student.assessment_score >= 60) {
      tags.add("assessment:developing");
    } else {
      tags.add("assessment:needs-support");
    }
  }
  if (student.notes) {
    tags.add("has-notes");
  }
  return Array.from(tags.values());
}

function buildAlbertNotes(student: StudentRecord): string {
  const lines: string[] = [];
  lines.push(`${student.first_name} ${student.last_name} is enrolled in this course.`);
  if (student.grade_level) {
    lines.push(`Grade level: ${student.grade_level}.`);
  }
  if (student.assessment_score !== null && student.assessment_score !== undefined) {
    lines.push(`Initial assessment score: ${student.assessment_score}.`);
  }
  if (student.learning_style?.length) {
    lines.push(`Learning preferences: ${student.learning_style.join(", ")}.`);
  }
  if (student.notes) {
    lines.push(`Teacher notes: ${student.notes}.`);
  }
  return lines.join(" ");
}

function generateProfileId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `profile_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export function buildAlbertProfile(student: StudentRecord): StudentProfile {
  return {
    ...student,
    profile_id: generateProfileId(),
    profile_tags: buildProfileTags(student),
    ai_notes: buildAlbertNotes(student),
  };
}

export function dispatchProfilesIndexed(courseId: string, students: StudentRecord[]): void {
  if (typeof window === "undefined") return;

  const profiles = students.map(buildAlbertProfile);
  const event = new CustomEvent("studentsProfilesUpdated", {
    detail: { courseId, profiles },
  });
  window.dispatchEvent(event);
}
