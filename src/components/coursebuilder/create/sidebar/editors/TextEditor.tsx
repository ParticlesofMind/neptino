"use client"

import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Color from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useRef, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { StudioInput, StudioNumberInput, StudioTextarea, StudioSelect } from "./studio-primitives"
import { EditorSplitLayout } from "./editor-split-layout"
import { EditorPreviewFrame } from "./editor-preview-frame"
import { TextEditorPreview } from "./text-editor-preview"
import { EntityRefMark } from "@/lib/tiptap/EntityRefMark"
import type { AtlasItem } from "@/types/atlas"

interface OllamaChatResponse {
  message?: string
  error?: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function plainTextToHtml(value: string): string {
  const normalized = value.trim()
  if (!normalized) return ""

  return normalized
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("")
}

interface TextEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export function TextEditor({ content, onChange }: TextEditorProps) {
  const html = typeof content.text === "string" ? content.text : ""
  const title = typeof content.title === "string" ? content.title : ""
  const readingLevel = typeof content.readingLevel === "string" ? content.readingLevel : ""
  const durationMinutes = typeof content.durationMinutes === "number" ? content.durationMinutes : 0
  const generationPrompt = typeof content.generationPrompt === "string" ? content.generationPrompt : ""
  const writingTone = typeof content.writingTone === "string" ? content.writingTone : "instructional"
  const targetLength = typeof content.targetLength === "string" ? content.targetLength : "medium"

  const suppressSync = useRef(false)
  const [showEntityPicker, setShowEntityPicker] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

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

  const canGenerate = generationPrompt.trim().length > 0 && !isGenerating

  const handleGenerate = async () => {
    if (!canGenerate) return

    setIsGenerating(true)
    setGenerationError(null)

    const systemPrompt = [
      "You write polished educational text for a course builder.",
      `Tone: ${writingTone}.`,
      `Target length: ${targetLength}.`,
      readingLevel ? `Reading level: ${readingLevel}.` : "",
      title ? `Block title: ${title}.` : "",
      "Return only the body copy with clear paragraphing. No markdown fences. No prefatory notes.",
    ].filter(Boolean).join("\n")

    try {
      const response = await fetch("/api/ollama-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: [{ role: "user", content: generationPrompt.trim() }],
        }),
      })

      const data = await response.json() as OllamaChatResponse
      if (!response.ok || !data.message?.trim()) {
        throw new Error(data.error || "Unable to generate text.")
      }

      onChange("text", plainTextToHtml(data.message))
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Unable to generate text.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <EditorSplitLayout
      sidebarWidthClassName="md:min-w-[26rem] md:flex-1 xl:min-w-[30rem]"
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
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">AI Generation</span>
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

            {generationError && (
              <p className="text-[11px] text-destructive">{generationError}</p>
            )}

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-900 px-3 py-2.5 text-[11px] font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      )}
      preview={(
        <div className="flex h-full min-h-0 items-center justify-center px-6 py-6 md:px-8">
          <EditorPreviewFrame
            cardType="text"
            title={title}
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
