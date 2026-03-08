export default function CourseBuilderLayout({ children }: { children: React.ReactNode }) {
  // No parent shell — take the full viewport
  return (
    <div className="h-screen overflow-x-visible overflow-y-hidden bg-background">
      {children}
    </div>
  )
}
