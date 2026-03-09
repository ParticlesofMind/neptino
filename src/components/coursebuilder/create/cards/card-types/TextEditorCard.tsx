"use client"

import { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import { Bold, Heading2, Italic, List, ListOrdered, Underline as UnderlineIcon } from "lucide-react"
import type { CardRenderProps } from "../CardRegistry"

interface ToolbarButtonProps {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}

function ToolbarButton({ active, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-md border text-neutral-600 transition-colors",
        active
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-neutral-200 bg-white hover:bg-neutral-50",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

export function TextEditorCard({ card, onRemove }: CardRenderProps) {
  const title = typeof card.content["title"] === "string" ? card.content["title"] : "Text editor"
  const placeholder = typeof card.content["placeholder"] === "string"
    ? card.content["placeholder"]
    : "Start writing..."
  const initialDocument = typeof card.content["document"] === "string"
    ? card.content["document"]
    : ""

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: initialDocument,
    editorProps: {
      attributes: {
        class: "h-full min-h-[180px] px-4 py-3 text-[13px] leading-6 text-neutral-700 outline-none",
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() === initialDocument) return
    editor.commands.setContent(initialDocument || "")
  }, [editor, initialDocument])

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
      style={{ width: "100%", height: card.dimensions.height || 360 }}
    >
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 z-20 hidden h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 shadow-sm hover:text-neutral-700 group-hover:flex"
          aria-label="Remove"
        >
          &times;
        </button>
      )}

      <div className="border-b border-neutral-200 bg-neutral-50/80 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Product</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
            <p className="text-[11px] text-neutral-500">TipTap writing workspace</p>
          </div>
          <div className="flex items-center gap-1.5">
            <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}>
              <Bold size={14} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}>
              <Italic size={14} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")}>
              <UnderlineIcon size={14} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })}>
              <Heading2 size={14} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")}>
              <List size={14} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")}>
              <ListOrdered size={14} />
            </ToolbarButton>
          </div>
        </div>
      </div>

      <div className="h-[calc(100%-73px)] overflow-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_li]:ml-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_ul]:list-disc">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}