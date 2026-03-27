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
import { LayoutTemplateEditor } from "./LayoutTemplateEditor"

export interface EditorShellProps {
  cardType: CardType
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

type EditorRenderer = (props: EditorShellProps) => JSX.Element

const EDITOR_RENDERERS: Partial<Record<CardType, EditorRenderer>> = {
  text: ({ content, onChange }) => <TextEditor content={content} onChange={onChange} />,
  image: ({ content, onChange }) => <ImageEditor content={content} onChange={onChange} />,
  audio: ({ content, onChange }) => <AudioEditor content={content} onChange={onChange} />,
  video: ({ content, onChange }) => <VideoEditor content={content} onChange={onChange} />,
  animation: ({ content, onChange }) => <AnimationEditor content={content} onChange={onChange} />,
  embed: ({ content, onChange }) => <DocumentEditor content={content} onChange={onChange} />,
  flashcards: ({ content, onChange }) => <GamesEditor content={content} onChange={onChange} />,
  "code-snippet": ({ content, onChange }) => <CodeProductEditor content={content} onChange={onChange} />,
  "model-3d": ({ content, onChange }) => <Model3DEditor content={content} onChange={onChange} />,
  chart: ({ content, onChange }) => <ChartEditor content={content} onChange={onChange} />,
  diagram: ({ content, onChange }) => <DiagramEditor content={content} onChange={onChange} />,
  map: ({ content, onChange }) => <MapEditor content={content} onChange={onChange} />,
  table: ({ content, onChange }) => <TableEditor content={content} onChange={onChange} />,
  document: ({ content, onChange }) => <DocumentEditor content={content} onChange={onChange} />,
  media: ({ content, onChange }) => <DocumentEditor content={content} onChange={onChange} />,
  interactive: ({ content, onChange }) => <InteractiveEditor content={content} onChange={onChange} />,
  form: ({ content, onChange }) => <InteractiveEditor content={content} onChange={onChange} />,
  "voice-recorder": ({ content, onChange }) => <InteractiveEditor content={content} onChange={onChange} />,
  sorter: ({ content, onChange }) => <GamesEditor content={content} onChange={onChange} />,
  dataset: ({ content, onChange }) => <DatasetEditor content={content} onChange={onChange} />,
  "rich-sim": ({ content, onChange }) => <RichSimEditor content={content} onChange={onChange} variant="rich-sim" />,
  "village-3d": ({ content, onChange }) => <RichSimEditor content={content} onChange={onChange} variant="village-3d" />,
  games: ({ content, onChange }) => <GamesEditor content={content} onChange={onChange} />,
  chat: ({ content, onChange }) => <ChatEditor content={content} onChange={onChange} />,
  "text-editor": ({ content, onChange }) => <TextProductEditor content={content} onChange={onChange} />,
  "code-editor": ({ content, onChange }) => <CodeProductEditor content={content} onChange={onChange} />,
  whiteboard: ({ content, onChange }) => <WhiteboardEditor content={content} onChange={onChange} />,
  timeline: ({ content, onChange }) => <TimelineEditor content={content} onChange={onChange} />,
  "layout-split": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-stack": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-feature": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-sidebar": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-quad": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-mosaic": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-triptych": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-trirow": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-banner": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-broadside": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-tower": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-pinboard": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-annotated": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-sixgrid": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-comparison": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-stepped": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-hero": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-dialogue": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-gallery": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-spotlight": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
  "layout-flipcard": ({ cardType, content, onChange }) => <LayoutTemplateEditor cardType={cardType} content={content} onChange={onChange} />,
}

export function renderEditor({ cardType, content, onChange }: EditorShellProps): JSX.Element | null {
  const renderer = EDITOR_RENDERERS[cardType]
  return renderer ? renderer({ cardType, content, onChange }) : null
}