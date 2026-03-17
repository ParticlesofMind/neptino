"use client"

import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Color from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useRef, useState } from "react"
import { Sparkles } from "lucide-react"
import { StudioInput, StudioNumberInput, StudioTextarea, StudioSelect } from "./studio-primitives"
import { EditorSplitLayout } from "./editor-split-layout"
import { EditorPreviewFrame } from "./editor-preview-frame"
import { TextEditorPreview } from "./text-editor-preview"
import { EntityRefMark } from "@/lib/tiptap/EntityRefMark"
import type { AtlasItem } from "@/types/atlas"

interface TextEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export function TextEditor({ content, onChange }: TextEditorProps) {
  const html = typeof content.text === "string" ? content.text : ""
  const readingLevel = typeof content.readingLevel === "string" ? content.readingLevel : ""
  const durationMinutes = typeof content.durationMinutes === "number" ? content.durationMinutes : 0
  const generationPrompt = typeof content.generationPrompt === "string" ? content.generationPrompt : ""
  const writingTone = typeof content.writingTone === "string" ? content.writingTone : "instructional"
  const targetLength = typeof content.targetLength === "string" ? content.targetLength : "medium"

  const suppressSync = useRef(false)
  const [showEntityPicker, setShowEntityPicker] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
      }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder: "Start writing your content here…" }),
      EntityRefMark,
    ],
    content: html,
    onUpdate({ editor: ed }) {
      suppressSync.current = true
      onChange("text", ed.getHTML())
      suppressSync.current = false
    },
  })

  // Sync external content changes into TipTap (e.g. if AI generates text)
  useEffect(() => {
    if (!editor) return
    if (suppressSync.current) return
    const current = editor.getHTML()
    if (current !== html) {
      editor.commands.setContent(html)
    }
  }, [editor, html])

  const setLink = () => {
    const url = window.prompt("Enter URL")
    if (!url) return
    editor?.chain().focus().setLink({ href: url }).run()
  }

  const handleEntitySelect = (entity: AtlasItem) => {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) {
      // No selection — insert entity title as annotated text
      editor
        .chain()
        .focus()
        .insertContent(`<span class="entity-ref" data-entity-id="${entity.id}" data-entity-title="${entity.title}" data-entity-type="${entity.knowledge_type}">${entity.title}</span> `)
        .run()
    } else {
      // Annotate the existing selection
      editor
        .chain()
        .focus()
        .setEntityRef({
          entityId:      entity.id,
          entityTitle:   entity.title,
          entityType:    entity.knowledge_type,
          entitySubType: entity.sub_type ?? undefined,
        })
        .run()
    }
    setShowEntityPicker(false)
  }

  return (
    <EditorSplitLayout
      sidebarWidthClassName="md:w-[26rem] xl:w-[30rem]"
      previewClassName="bg-white"
      previewContentClassName="overflow-hidden"
      sidebar={(
        <div className="flex h-full flex-col bg-white">
          <div className="border-b border-neutral-100 px-4 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
              <StudioInput
                label="Reading level"
                value={readingLevel}
                placeholder="B1, Grade 8…"
                onChange={(e) => onChange("readingLevel", e.target.value)}
              />
              <StudioNumberInput
                label="Duration (min)"
                value={durationMinutes}
                min={0}
                max={180}
                onChange={(v) => onChange("durationMinutes", v)}
              />
            </div>
          </div>

          <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-neutral-400" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">AI Generation</span>
            </div>

            <StudioTextarea
              label="Prompt"
              value={generationPrompt}
              rows={4}
              placeholder="Describe what to write about…"
              onChange={(e) => onChange("generationPrompt", e.target.value)}
            />

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <StudioSelect
                label="Tone"
                value={writingTone}
                onChange={(e) => onChange("writingTone", e.target.value)}
              >
                <option value="instructional">Instructional</option>
                <option value="academic">Academic</option>
                <option value="conversational">Conversational</option>
                <option value="narrative">Narrative</option>
              </StudioSelect>
              <StudioSelect
                label="Length"
                value={targetLength}
                onChange={(e) => onChange("targetLength", e.target.value)}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </StudioSelect>
            </div>

            <button
              type="button"
              disabled
              className="flex min-h-10 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-100 px-3 py-2.5 text-[11px] font-semibold text-neutral-400"
            >
              <Sparkles size={11} />
              Generate
            </button>
          </div>
        </div>
      )}
      preview={(
        <div className="flex h-full min-h-0 items-center justify-center px-6 py-6 md:px-8">
          <EditorPreviewFrame
            cardType="text"
            title={typeof content.title === "string" ? content.title : ""}
            onTitleChange={(next) => onChange("title", next)}
            className="h-full w-full max-w-5xl"
            bodyClassName="h-[min(42rem,100%)] bg-white"
          >
            <TextEditorPreview
              editor={editor}
              showEntityPicker={showEntityPicker}
              onToggleEntityPicker={() => setShowEntityPicker((value) => !value)}
              onCloseEntityPicker={() => setShowEntityPicker(false)}
              onSetLink={setLink}
              onEntitySelect={handleEntitySelect}
            />
          </EditorPreviewFrame>
        </div>
      )}
    />
  )
}
