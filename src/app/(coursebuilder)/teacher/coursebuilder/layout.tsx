export default function CourseBuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] min-h-[100dvh] overflow-hidden bg-muted/20 text-foreground">
      {children}
    </div>
  )
}
