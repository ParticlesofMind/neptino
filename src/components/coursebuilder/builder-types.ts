// Shared types for the course builder page — imported by the page and by
// section/view components that need to know about the top-level navigation.

export type View = "setup" | "create" | "preview" | "launch"

export interface CourseEssentials {
  title:       string
  subtitle:    string
  description: string
  language:    string
  courseType:  string
  teacherId:   string
  teacherName: string
  institution: string
  imageName:   string | null
}

export interface CourseCreatedData extends CourseEssentials {
  imageUrl: string | null
}
