"use client"

import { useRef } from "react"
import { Plus, Trash2 } from "lucide-react"
import { EditorSplitLayout } from "./editor-split-layout"
import { EditorPreviewFrame } from "./editor-preview-frame"

interface TableEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

function parseColumns(raw: unknown): string[] {
  if (Array.isArray(raw) && raw.every((c) => typeof c === "string")) return raw as string[]
  return ["Column 1", "Column 2", "Column 3"]
}

function parseRows(raw: unknown): string[][] {
  if (!Array.isArray(raw)) return [["", "", ""], ["", "", ""]]
  return raw.map((r) => (Array.isArray(r) ? r : []))
}

export function TableEditor({ content, onChange }: TableEditorProps) {
  const tableRef = useRef<HTMLTableElement>(null)

  const title = typeof content.title === "string" ? content.title : ""
  const columns = parseColumns(content.columns)
  const rows = parseRows(content.rows)
  const sortable = typeof content.sortable === "boolean" ? content.sortable : true
  const rowLimit = typeof content.rowLimit === "number" ? content.rowLimit : 25
  const highlightRule = typeof content.highlightRule === "string" ? content.highlightRule : ""

  const setColumn = (i: number, val: string) => {
    const next = [...columns]
    next[i] = val
    onChange("columns", next)
  }

  const setCell = (ri: number, ci: number, val: string) => {
    const next = rows.map((r, idx) => idx === ri ? [...r] : [...r])
    if (!next[ri]) next[ri] = []
    next[ri][ci] = val
    onChange("rows", next)
  }

  const addColumn = () => {
    if (columns.length >= 8) return
    onChange("columns", [...columns, `Column ${columns.length + 1}`])
    onChange("rows", rows.map((r) => [...r, ""]))
  }

  const removeColumn = (i: number) => {
    if (columns.length <= 1) return
    onChange("columns", columns.filter((_, idx) => idx !== i))
    onChange("rows", rows.map((r) => r.filter((_, idx) => idx !== i)))
  }

  const addRow = () => {
    if (rows.length >= 50) return
    onChange("rows", [...rows, Array(columns.length).fill("")])
  }

  const removeRow = (i: number) => {
    onChange("rows", rows.filter((_, idx) => idx !== i))
  }

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, ri: number, ci: number) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const nextCi = ci + 1
      const nextRi = ri + (nextCi >= columns.length ? 1 : 0)
      const finalCi = nextCi >= columns.length ? 0 : nextCi
      if (nextRi >= rows.length) {
        onChange("rows", [...rows, Array(columns.length).fill("")])
      }
      // Focus next cell
      const inputs = tableRef.current?.querySelectorAll("td input")
      const idx = nextRi * columns.length + finalCi
      if (inputs && inputs[idx]) {
        (inputs[idx] as HTMLInputElement).focus()
      }
    }
    if (e.key === "Enter") {
      e.preventDefault()
      const nextRi = ri + 1
      if (nextRi >= rows.length) {
        onChange("rows", [...rows, Array(columns.length).fill("")])
      }
      const inputs = tableRef.current?.querySelectorAll("td input")
      const idx = nextRi * columns.length + ci
      if (inputs && inputs[idx]) {
        (inputs[idx] as HTMLInputElement).focus()
      }
    }
  }

  return (
    <EditorSplitLayout
      sidebarWidthClassName="md:w-[26rem] xl:w-[30rem]"
      previewContentClassName="overflow-auto"
      sidebar={(
        <div className="space-y-3 px-4 py-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              Structure
            </p>
            <p className="mt-1 text-[12px] text-neutral-700">
              {rows.length} rows × {columns.length} columns
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={addColumn}
                disabled={columns.length >= 8}
                className="flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
              >
                <Plus size={10} /> Column
              </button>
              <button
                type="button"
                onClick={addRow}
                disabled={rows.length >= 50}
                className="flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
              >
                <Plus size={10} /> Row
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Options</p>
            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-neutral-600">Row limit</span>
                <input
                  type="number"
                  value={rowLimit}
                  min={1}
                  max={1000}
                  onChange={(e) => onChange("rowLimit", Number(e.target.value))}
                  className="min-h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-neutral-600">Highlight rule</span>
                <input
                  type="text"
                  value={highlightRule}
                  placeholder="e.g. value > 90"
                  onChange={(e) => onChange("highlightRule", e.target.value)}
                  className="min-h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
                />
              </label>
            </div>

            <label className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange("sortable", !sortable)}
                role="switch"
                aria-checked={sortable}
                aria-label="Sortable columns"
                className={[
                  "relative inline-flex h-7 w-12 shrink-0 items-center overflow-hidden rounded-full border p-[2px] transition-all",
                  sortable ? "border-[#9eb9da] bg-[#dbe8f6]" : "border-neutral-300 bg-neutral-100",
                ].join(" ")}
              >
                <span className={[
                  "block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  sortable ? "translate-x-5" : "translate-x-0",
                ].join(" ")} />
              </button>
              <span className="text-[11px] font-medium text-neutral-600">Sortable columns</span>
            </label>
          </div>

          <p className="text-[10px] text-neutral-400">Tab advances cells. Enter moves to the same column on the next row.</p>
        </div>
      )}
      preview={(
        <div className="flex h-full min-h-0 items-center justify-center px-6 py-6 md:px-8">
          <EditorPreviewFrame
            cardType="table"
            title={title}
            onTitleChange={(next) => onChange("title", next)}
            className="max-h-full w-full max-w-5xl"
            bodyClassName="overflow-auto p-5"
          >
              <table ref={tableRef} className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-neutral-50">
                    {columns.map((col, ci) => (
                      <th key={ci} className="border border-neutral-200 p-0 min-w-[90px]">
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={col}
                            onChange={(e) => setColumn(ci, e.target.value)}
                            className="w-full bg-transparent px-3 py-2.5 text-[11px] font-semibold text-neutral-700 outline-none"
                          />
                          {columns.length > 1 && (
                            <button type="button" onClick={() => removeColumn(ci)} className="pr-1 text-neutral-300 hover:text-destructive shrink-0">
                              <Trash2 size={9} />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-6 border border-neutral-200 bg-neutral-50" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-neutral-50/50">
                      {columns.map((_, ci) => (
                        <td key={ci} className="border border-neutral-200 p-0">
                          <input
                            type="text"
                            value={row[ci] ?? ""}
                            onChange={(e) => setCell(ri, ci, e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, ri, ci)}
                            className="w-full bg-transparent px-3 py-2 text-[11px] text-neutral-700 outline-none focus:bg-primary/5"
                            placeholder="—"
                          />
                        </td>
                      ))}
                      <td className="border border-neutral-200 px-1 text-center">
                        <button type="button" onClick={() => removeRow(ri)} className="text-neutral-300 hover:text-destructive">
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </EditorPreviewFrame>
        </div>
      )}
    />
  )
}
