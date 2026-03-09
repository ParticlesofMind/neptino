"use client"

import { useMemo, useState } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { html } from "@codemirror/lang-html"
import { css } from "@codemirror/lang-css"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import type { Extension } from "@codemirror/state"
import type { CardRenderProps } from "../CardRegistry"

type CodeLanguage = "javascript" | "typescript" | "html" | "css" | "json" | "markdown"

function resolveExtension(language: CodeLanguage): Extension {
  switch (language) {
    case "typescript":
      return javascript({ typescript: true })
    case "html":
      return html()
    case "css":
      return css()
    case "json":
      return json()
    case "markdown":
      return markdown()
    case "javascript":
    default:
      return javascript({ jsx: true })
  }
}

export function CodeEditorCard({ card, onRemove }: CardRenderProps) {
  const title = typeof card.content["title"] === "string" ? card.content["title"] : "Code editor"
  const prompt = typeof card.content["prompt"] === "string" ? card.content["prompt"] : ""
  const initialLanguage = typeof card.content["language"] === "string"
    ? card.content["language"] as CodeLanguage
    : "javascript"
  const initialCode = typeof card.content["code"] === "string"
    ? card.content["code"]
    : ""

  const [language, setLanguage] = useState<CodeLanguage>(initialLanguage)
  const [code, setCode] = useState(initialCode)

  const extensions = useMemo(() => [resolveExtension(language)], [language])

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-[#0b1220] shadow-sm"
      style={{ width: "100%", height: card.dimensions.height || 380 }}
    >
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 z-20 hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/30 text-neutral-300 hover:text-white group-hover:flex"
          aria-label="Remove"
        >
          &times;
        </button>
      )}

      <div className="flex items-center justify-between border-b border-white/10 bg-[#111a2c] px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Product</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-100">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
            CodeMirror
          </span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as CodeLanguage)}
            className="rounded-md border border-white/10 bg-[#0b1220] px-2 py-1 text-[11px] text-slate-200 outline-none"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>
      </div>

      {prompt && (
        <div className="border-b border-white/10 bg-[#0f1728] px-4 py-2 text-[11px] text-slate-400">
          {prompt}
        </div>
      )}

      <div className="h-[calc(100%-95px)] overflow-hidden">
        <CodeMirror
          value={code}
          height="100%"
          extensions={extensions}
          onChange={(value) => setCode(value)}
          basicSetup={{
            foldGutter: true,
            highlightActiveLine: true,
            lineNumbers: true,
          }}
          theme="dark"
        />
      </div>
    </div>
  )
}