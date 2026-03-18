import { BookOpen, GraduationCap, ShieldCheck } from "lucide-react"

const guides: Array<{
  category: string
  icon: React.ElementType
  iconColor: string
  articles: Array<{ title: string; updated: string }>
}> = [
  {
    category: "Teacher Guides",
    icon: BookOpen,
    iconColor: "#6b8fc4",
    articles: [
      { title: "Getting started with the Course Builder", updated: "2 days ago" },
      { title: "Creating and managing templates", updated: "1 week ago" },
      { title: "Publishing and enrolling students", updated: "2 weeks ago" },
      { title: "Grading assignments and giving feedback", updated: "1 month ago" },
    ],
  },
  {
    category: "Student Guides",
    icon: GraduationCap,
    iconColor: "#5c9970",
    articles: [
      { title: "Joining a course and enrollment", updated: "3 days ago" },
      { title: "Navigating your student dashboard", updated: "1 week ago" },
      { title: "Submitting assignments", updated: "3 weeks ago" },
      { title: "Using the messaging system", updated: "1 month ago" },
    ],
  },
  {
    category: "Admin Documentation",
    icon: ShieldCheck,
    iconColor: "#a89450",
    articles: [
      { title: "User management and roles", updated: "Yesterday" },
      { title: "Course approval workflow", updated: "5 days ago" },
      { title: "Marketplace moderation", updated: "2 weeks ago" },
      { title: "Platform configuration reference", updated: "1 month ago" },
    ],
  },
]

import React from "react"

export default function AdminTutorialsPage() {
  return (
    <div className="space-y-8">
      {guides.map((group) => {
        const GroupIcon = group.icon
        return (
          <div key={group.category}>
            <div className="mb-4 flex items-center gap-2">
              <GroupIcon className="h-4 w-4" style={{ color: group.iconColor }} />
              <h2 className="text-base font-semibold text-foreground">{group.category}</h2>
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {group.articles.length}
              </span>
            </div>
            <div className="divide-y divide-border rounded-lg border border-border bg-background">
              {group.articles.map((article) => (
                <div key={article.title} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <p className="text-sm font-medium text-foreground">{article.title}</p>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">{article.updated}</span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
