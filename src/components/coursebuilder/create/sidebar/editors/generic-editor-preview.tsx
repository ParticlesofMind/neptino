"use client"

import type { CardType } from "../../types"
import { CardTypePreview } from "../../cards/CardTypePreview"
import { EditorPreviewFrame } from "./editor-preview-frame"

interface GenericEditorPreviewProps {
  cardType: CardType
  content: Record<string, unknown>
  maxWidthClassName?: string
  frameClassName?: string
  bodyClassName?: string
  onTitleChange: (title: string) => void
}

export function GenericEditorPreview({
  cardType,
  content,
  maxWidthClassName = "max-w-3xl",
  frameClassName,
  bodyClassName = "p-5",
  onTitleChange,
}: GenericEditorPreviewProps) {
  const title = typeof content.title === "string" ? content.title : ""

  return (
    <div className="flex h-full min-h-0 items-center justify-center px-6 py-6 md:px-8">
      <EditorPreviewFrame
        cardType={cardType}
        title={title}
        onTitleChange={onTitleChange}
        className={["w-full", maxWidthClassName, frameClassName].filter(Boolean).join(" ")}
        bodyClassName={bodyClassName}
      >
        <CardTypePreview cardType={cardType} content={content} hideTitle />
      </EditorPreviewFrame>
    </div>
  )
}