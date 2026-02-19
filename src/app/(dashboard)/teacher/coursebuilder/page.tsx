import { PixiCanvas } from '@/components/canvas/PixiCanvas'

export default function CourseBuilderPage() {
  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold">Course Builder</h1>
         <div className="text-sm text-muted-foreground">Canvas Engine v8 (P0 Wrapper)</div>
      </div>
      <div className="flex-1 min-h-0 border rounded-xl overflow-hidden relative">
        <PixiCanvas backgroundColor={0xf5f5f5} />
      </div>
    </div>
  )
}
