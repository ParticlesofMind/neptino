/** Shared editor props for all card-type editor components. */
export interface EditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export type MapEditorProps = EditorProps
export type TimelineEditorProps = EditorProps

