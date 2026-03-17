"use client"

import type { CardType } from "../../types"
import { AnimationEditor } from "./AnimationEditor"
import { AudioEditor } from "./AudioEditor"
import { ChartEditor } from "./ChartEditor"
import { ChatEditor } from "./ChatEditor"
import { CodeProductEditor } from "./CodeProductEditor"
import { DatasetEditor } from "./DatasetEditor"
import { DiagramEditor } from "./DiagramEditor"
import { DocumentEditor } from "./DocumentEditor"
import { GamesEditor } from "./GamesEditor"
import { ImageEditor } from "./ImageEditor"
import { InteractiveEditor } from "./InteractiveEditor"
import { MapEditor } from "./MapEditor"
import { Model3DEditor } from "./Model3DEditor"
import { RichSimEditor } from "./RichSimEditor"
import { TableEditor } from "./TableEditor"
import { TextEditor } from "./TextEditor"
import { TextProductEditor } from "./TextProductEditor"
import { TimelineEditor } from "./TimelineEditor"
import { VideoEditor } from "./VideoEditor"
import { WhiteboardEditor } from "./WhiteboardEditor"

export interface EditorShellProps {
  cardType: CardType
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

type EditorRenderer = (props: Omit<EditorShellProps, "cardType">) => JSX.Element

const EDITOR_RENDERERS: Partial<Record<CardType, EditorRenderer>> = {
  text: ({ content, onChange }) => <TextEditor content={content} onChange={onChange} />,
  image: ({ content, onChange }) => <ImageEditor content={content} onChange={onChange} />,
  audio: ({ content, onChange }) => <AudioEditor content={content} onChange={onChange} />,
  video: ({ content, onChange }) => <VideoEditor content={content} onChange={onChange} />,
  animation: ({ content, onChange }) => <AnimationEditor content={content} onChange={onChange} />,
  "model-3d": ({ content, onChange }) => <Model3DEditor content={content} onChange={onChange} />,
  chart: ({ content, onChange }) => <ChartEditor content={content} onChange={onChange} />,
  diagram: ({ content, onChange }) => <DiagramEditor content={content} onChange={onChange} />,
  map: ({ content, onChange }) => <MapEditor content={content} onChange={onChange} />,
  table: ({ content, onChange }) => <TableEditor content={content} onChange={onChange} />,
  document: ({ content, onChange }) => <DocumentEditor content={content} onChange={onChange} />,
  media: ({ content, onChange }) => <DocumentEditor content={content} onChange={onChange} />,
  interactive: ({ content, onChange }) => <InteractiveEditor content={content} onChange={onChange} />,
  dataset: ({ content, onChange }) => <DatasetEditor content={content} onChange={onChange} />,
  "rich-sim": ({ content, onChange }) => <RichSimEditor content={content} onChange={onChange} variant="rich-sim" />,
  "village-3d": ({ content, onChange }) => <RichSimEditor content={content} onChange={onChange} variant="village-3d" />,
  games: ({ content, onChange }) => <GamesEditor content={content} onChange={onChange} />,
  chat: ({ content, onChange }) => <ChatEditor content={content} onChange={onChange} />,
  "text-editor": ({ content, onChange }) => <TextProductEditor content={content} onChange={onChange} />,
  "code-editor": ({ content, onChange }) => <CodeProductEditor content={content} onChange={onChange} />,
  whiteboard: ({ content, onChange }) => <WhiteboardEditor content={content} onChange={onChange} />,
  timeline: ({ content, onChange }) => <TimelineEditor content={content} onChange={onChange} />,
}

export function renderEditor({ cardType, content, onChange }: EditorShellProps): JSX.Element | null {
  const renderer = EDITOR_RENDERERS[cardType]
  return renderer ? renderer({ content, onChange }) : null
}