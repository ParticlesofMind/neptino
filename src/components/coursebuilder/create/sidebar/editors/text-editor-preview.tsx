"use client"

import type { Editor } from "@tiptap/react"
import { EditorContent } from "@tiptap/react"
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Tag,
  Underline as UnderlineIcon,
  X,
} from "lucide-react"

import { AtlasEntitySearch } from "@/components/atlas/AtlasEntitySearch"
import type { AtlasItem } from "@/types/atlas"

interface TextEditorPreviewProps {
  editor: Editor | null
  showEntityPicker: boolean
  onToggleEntityPicker: () => void
  onCloseEntityPicker: () => void
  onSetLink: () => void
  onEntitySelect: (entity: AtlasItem) => void
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

export function TextEditorPreview({
  editor,
  showEntityPicker,
  onToggleEntityPicker,
  onCloseEntityPicker,
  onSetLink,
  onEntitySelect,
}: TextEditorPreviewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
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

        <ToolbarButton title="Bold" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}>
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}>
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton title="Underline" onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")}>
          <UnderlineIcon size={13} />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")}>
          <Strikethrough size={13} />
        </ToolbarButton>
        <ToolbarButton title="Link" onClick={onSetLink} active={editor?.isActive("link")}>
          <LinkIcon size={13} />
        </ToolbarButton>
        <ToolbarButton title="Annotate entity reference" onClick={onToggleEntityPicker} active={showEntityPicker || editor?.isActive("entityRef")}>
          <Tag size={13} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        <ToolbarButton title="Bullet list" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")}>
          <List size={13} />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")}>
          <ListOrdered size={13} />
        </ToolbarButton>
        <ToolbarButton title="Blockquote" onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")}>
          <Quote size={13} />
        </ToolbarButton>
        <ToolbarButton title="Horizontal rule" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
          <Minus size={13} />
        </ToolbarButton>
      </div>

      {showEntityPicker && (
        <div className="shrink-0 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Tag size={11} className="text-neutral-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                Annotate entity reference
              </span>
            </div>
            <button type="button" onClick={onCloseEntityPicker} className="text-neutral-400 hover:text-neutral-700">
              <X size={13} />
            </button>
          </div>
          <p className="mb-2 text-[10px] text-neutral-400">
            Select text first, then pick an entity — or pick an entity to insert it.
          </p>
          <AtlasEntitySearch onSelect={onEntitySelect} autoFocus />
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-auto bg-white">
        <EditorContent editor={editor} className="tiptap-editor h-full" />
        <style>{`
          .tiptap-editor .ProseMirror {
            min-height: 200px;
            outline: none;
            padding: 16px 20px;
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
    </div>
  )
}