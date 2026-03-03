"use client"

import type { CardType } from "../../types"
import { TextEditor } from "./TextEditor"
import { ImageEditor } from "./ImageEditor"
import { AudioEditor } from "./AudioEditor"
import { VideoEditor } from "./VideoEditor"
import { AnimationEditor } from "./AnimationEditor"
import { Model3DEditor } from "./Model3DEditor"
import { ChartEditor } from "./ChartEditor"
import { DiagramEditor } from "./DiagramEditor"
import { MapEditor } from "./MapEditor"
import { TableEditor } from "./TableEditor"
import { DocumentEditor } from "./DocumentEditor"
import { InteractiveEditor } from "./InteractiveEditor"
import { DatasetEditor } from "./DatasetEditor"
import { RichSimEditor } from "./RichSimEditor"

export interface EditorShellProps {
  cardType: CardType
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

/**
 * EditorShell
 *
 * Routes to the appropriate per-type rich editor component.
 * Each editor receives the full content object and an onChange callback.
 */
export function EditorShell({ cardType, content, onChange }: EditorShellProps) {
  switch (cardType) {
    case "text":
      return <TextEditor content={content} onChange={onChange} />

    case "image":
      return <ImageEditor content={content} onChange={onChange} />

    case "audio":
      return <AudioEditor content={content} onChange={onChange} />

    case "video":
      return <VideoEditor content={content} onChange={onChange} />

    case "animation":
      return <AnimationEditor content={content} onChange={onChange} />

    case "model-3d":
      return <Model3DEditor content={content} onChange={onChange} />

    case "chart":
      return <ChartEditor content={content} onChange={onChange} />

    case "diagram":
      return <DiagramEditor content={content} onChange={onChange} />

    case "map":
      return <MapEditor content={content} onChange={onChange} />

    case "table":
      return <TableEditor content={content} onChange={onChange} />

    case "document":
    case "media":
      return <DocumentEditor content={content} onChange={onChange} />

    case "interactive":
      return <InteractiveEditor content={content} onChange={onChange} />

    case "dataset":
      return <DatasetEditor content={content} onChange={onChange} />

    case "rich-sim":
      return <RichSimEditor content={content} onChange={onChange} variant="rich-sim" />

    case "village-3d":
      return <RichSimEditor content={content} onChange={onChange} variant="village-3d" />

    default:
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-[12px] text-neutral-400">No editor available for this card type.</p>
        </div>
      )
  }
}
