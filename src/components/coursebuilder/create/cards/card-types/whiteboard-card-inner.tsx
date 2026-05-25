"use client"

import { Tldraw, type Editor } from "tldraw"
import "tldraw/tldraw.css"

interface WhiteboardCardInnerProps {
  persistenceKey: string
  readOnly?: boolean
  hideUi?: boolean
}

export default function WhiteboardCardInner({
  persistenceKey,
  readOnly = false,
  hideUi = false,
}: WhiteboardCardInnerProps) {
  const handleMount = (editor: Editor) => {
    editor.updateInstanceState({ isReadonly: readOnly })
    if (readOnly) {
      editor.setCurrentTool("hand")
    }
  }

  return (
    <div className="h-full w-full">
      <Tldraw
        persistenceKey={persistenceKey}
        hideUi={hideUi}
        inferDarkMode={false}
        onMount={handleMount}
        options={{
          maxPages: 1,
          maxShapesPerPage: 400,
        }}
      />
    </div>
  )
}
