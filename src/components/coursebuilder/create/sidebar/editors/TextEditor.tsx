"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Color from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import { useEffect, useRef, useState } from "react"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Sparkles,
  Link as LinkIcon,
  Tag,
  X,
} from "lucide-react"
import { StudioInput, StudioNumberInput, StudioTextarea, StudioSelect } from "./studio-primitives"
import { EntityRefMark } from "@/lib/tiptap/EntityRefMark"
import { AtlasEntitySearch } from "@/components/nachschlagewerk/AtlasEntitySearch"
import type { AtlasItem } from "@/types/atlas"

interface TextEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

function wordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return text ? text.split(" ").length : 0
}

function readingTime(words: number): string {
  const mins = Math.ceil(words / 200)
  return mins <= 1 ? "~1 min read" : `~${mins} min read`
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "flex h-7 w-7 items-center justify-center transition-colors",
        active
          ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
      ].join(" ")}
    >
      {children}
    </button>
  )
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
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder: "Start writing your content here…" }),
      Link.configure({ openOnClick: false }),
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

  const words = wordCount(editor?.getHTML() ?? html)

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
    <div className="flex h-full flex-col">
      {/* Formatting toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-white px-2 py-1">
        <ToolbarButton
          title="Heading 1"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor?.isActive("heading", { level: 1 })}
        >
          <Heading1 size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive("heading", { level: 2 })}
        >
          <Heading2 size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor?.isActive("heading", { level: 3 })}
        >
          <Heading3 size={13} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        <ToolbarButton
          title="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
        >
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
        >
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          active={editor?.isActive("underline")}
        >
          <UnderlineIcon size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          active={editor?.isActive("strike")}
        >
          <Strikethrough size={13} />
        </ToolbarButton>
        <ToolbarButton title="Link" onClick={setLink} active={editor?.isActive("link")}>
          <LinkIcon size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Annotate entity reference"
          onClick={() => setShowEntityPicker((v) => !v)}
          active={showEntityPicker || editor?.isActive("entityRef")}
        >
          <Tag size={13} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        <ToolbarButton
          title="Bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
        >
          <List size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList")}
        >
          <ListOrdered size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive("blockquote")}
        >
          <Quote size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Horizontal rule"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={13} />
        </ToolbarButton>
      </div>

      {/* Entity picker — inline popover below toolbar */}
      {showEntityPicker && (
        <div className="shrink-0 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Tag size={11} className="text-neutral-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                Annotate entity reference
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowEntityPicker(false)}
              className="text-neutral-400 hover:text-neutral-700"
            >
              <X size={13} />
            </button>
          </div>
          <p className="mb-2 text-[10px] text-neutral-400">
            Select text first, then pick an entity — or pick an entity to insert it.
          </p>
          <AtlasEntitySearch onSelect={handleEntitySelect} autoFocus />
        </div>
      )}

      {/* Editor body */}
      <div className="relative min-h-0 flex-1 overflow-auto bg-white">
        <EditorContent editor={editor} className="tiptap-editor h-full" />
        <style>{`
          .tiptap-editor .ProseMirror {
            min-height: 200px;
            outline: none;
            padding: 12px 16px;
            font-size: 13px;
            line-height: 1.65;
            color: #1a1a1a;
          }
          .tiptap-editor .ProseMirror p { margin: 0 0 0.75em; }
          .tiptap-editor .ProseMirror p:last-child { margin-bottom: 0; }
          .tiptap-editor .ProseMirror h1 { font-size: 1.5em; font-weight: 700; margin: 0.8em 0 0.4em; }
          .tiptap-editor .ProseMirror h2 { font-size: 1.25em; font-weight: 700; margin: 0.8em 0 0.4em; }
          .tiptap-editor .ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.4em; }
          .tiptap-editor .ProseMirror strong { font-weight: 700; }
          .tiptap-editor .ProseMirror em { font-style: italic; }
          .tiptap-editor .ProseMirror u { text-decoration: underline; }
          .tiptap-editor .ProseMirror s { text-decoration: line-through; }
          .tiptap-editor .ProseMirror a { color: #3b82f6; text-decoration: underline; }
          .tiptap-editor .ProseMirror ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
          .tiptap-editor .ProseMirror ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
          .tiptap-editor .ProseMirror li { margin: 0.2em 0; }
          .tiptap-editor .ProseMirror blockquote { border-left: 3px solid #e5e7eb; padding-left: 1em; margin: 0.75em 0; color: #6b7280; }
          .tiptap-editor .ProseMirror hr { border: none; border-top: 1px solid #e5e7eb; margin: 1em 0; }
          .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            color: #9ca3af;
            float: left;
            height: 0;
            pointer-events: none;
          }
          .tiptap-editor .ProseMirror .entity-ref {
            border-bottom: 2px dotted #6b9fe8;
            color: inherit;
            cursor: pointer;
            padding-bottom: 1px;
          }
          .tiptap-editor .ProseMirror .entity-ref:hover {
            background: rgba(107, 159, 232, 0.10);
            border-radius: 2px;
          }
        `}</style>
      </div>

      {/* Word count strip */}
      <div className="flex shrink-0 items-center justify-between border-t border-neutral-100 bg-neutral-50 px-4 py-1.5">
        <span className="text-[10px] text-neutral-400">{words} words · {readingTime(words)}</span>
      </div>

      {/* Metadata section */}
      <div className="shrink-0 border-t border-neutral-100 bg-white px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
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

      {/* AI generation section */}
      <div className="shrink-0 border-t border-neutral-100 bg-neutral-50 px-4 py-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} className="text-neutral-400" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">AI Generation</span>
        </div>
        <StudioTextarea
          value={generationPrompt}
          rows={2}
          placeholder="Describe what to write about…"
          onChange={(e) => onChange("generationPrompt", e.target.value)}
        />
        <div className="flex items-center gap-2">
          <StudioSelect
            value={writingTone}
            onChange={(e) => onChange("writingTone", e.target.value)}
            className="flex-1"
          >
            <option value="instructional">Instructional</option>
            <option value="academic">Academic</option>
            <option value="conversational">Conversational</option>
            <option value="narrative">Narrative</option>
          </StudioSelect>
          <StudioSelect
            value={targetLength}
            onChange={(e) => onChange("targetLength", e.target.value)}
            className="flex-1"
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </StudioSelect>
          <button
            type="button"
            disabled
            className="flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-100 px-3 py-2 text-[11px] font-semibold text-neutral-400"
          >
            <Sparkles size={11} />
            Generate
          </button>
        </div>
      </div>
    </div>
  )
}
