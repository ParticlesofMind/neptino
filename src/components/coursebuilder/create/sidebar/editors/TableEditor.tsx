"use client"

import { useRef } from "react"
import { Plus, Trash2 } from "lucide-react"

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
    <div className="flex h-full flex-col overflow-auto bg-white">
      {/* Table grid */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            Data — {rows.length} rows × {columns.length} columns
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={addColumn}
              disabled={columns.length >= 8}
              className="flex items-center gap-1 border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
            >
              <Plus size={10} /> Col
            </button>
            <button
              type="button"
              onClick={addRow}
              disabled={rows.length >= 50}
              className="flex items-center gap-1 border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
            >
              <Plus size={10} /> Row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-200">
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
                        className="w-full bg-transparent px-2 py-2 text-[11px] font-semibold text-neutral-700 outline-none"
                      />
                      {columns.length > 1 && (
                        <button type="button" onClick={() => removeColumn(ci)} className="pr-1 text-neutral-300 hover:text-red-500 shrink-0">
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
                        className="w-full bg-transparent px-2 py-1.5 text-[11px] text-neutral-700 outline-none focus:bg-blue-50/50"
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="border border-neutral-200 px-1 text-center">
                    <button type="button" onClick={() => removeRow(ri)} className="text-neutral-300 hover:text-red-500">
                      <Trash2 size={10} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[10px] text-neutral-400">Tab to advance cells · Enter for next row</p>
      </div>

      {/* Settings */}
      <div className="shrink-0 border-t border-neutral-200 px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Row limit</span>
            <input
              type="number"
              value={rowLimit}
              min={1}
              max={1000}
              onChange={(e) => onChange("rowLimit", Number(e.target.value))}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Highlight rule</span>
            <input
              type="text"
              value={highlightRule}
              placeholder="e.g. value > 90"
              onChange={(e) => onChange("highlightRule", e.target.value)}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
            />
          </label>
        </div>

        <label className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange("sortable", !sortable)}
            className={[
              "h-6 w-11 border relative transition-colors",
              sortable ? "border-neutral-900 bg-neutral-900" : "border-neutral-300 bg-neutral-100",
            ].join(" ")}
            aria-pressed={sortable}
          >
            <span className={[
              "absolute top-0.5 h-5 w-5 bg-white transition-transform",
              sortable ? "translate-x-5" : "translate-x-0.5",
            ].join(" ")} />
          </button>
          <span className="text-[11px] font-medium text-neutral-600">Sortable columns</span>
        </label>
      </div>
    </div>
  )
}
