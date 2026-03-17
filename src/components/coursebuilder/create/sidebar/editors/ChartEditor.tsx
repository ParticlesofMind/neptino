"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { EditorSplitLayout } from "./editor-split-layout"
import { EditorPreviewFrame } from "./editor-preview-frame"

import {
  ChartType,
  ResponsiveChartEditorPreview,
} from "./chart-editor-preview"

interface ChartEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

const COLOR_SCHEMES: Record<string, string[]> = {
  Blue:   ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
  Purple: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"],
  Teal:   ["#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#ccfbf1"],
  Warm:   ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#fef3c7"],
  Mono:   ["#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af"],
}

type Row = string[]

function parseRows(raw: unknown): Row[] {
  if (!Array.isArray(raw)) return [["", "", ""], ["", "", ""]]
  return raw.map((r) => (Array.isArray(r) ? r : []))
}

function parseColumns(raw: unknown): string[] {
  if (Array.isArray(raw) && raw.every((c) => typeof c === "string")) return raw as string[]
  return ["Label", "Series A", "Series B"]
}

function rowsToChartData(columns: string[], rows: Row[]): object[] {
  return rows.map((row) => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, i) => {
      const val = row[i] ?? ""
      obj[col] = i === 0 ? val : (isNaN(Number(val)) ? 0 : Number(val))
    })
    return obj
  })
}

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: "line", label: "Line" },
  { id: "bar", label: "Bar" },
  { id: "area", label: "Area" },
  { id: "scatter", label: "Scatter" },
  { id: "pie", label: "Pie" },
]

export function ChartEditor({ content, onChange }: ChartEditorProps) {
  const [colorScheme, setColorScheme] = useState(typeof content.colorScheme === "string" ? content.colorScheme : "Blue")

  const title = typeof content.title === "string" ? content.title : ""
  const chartType = (typeof content.chartType === "string" ? content.chartType : "line") as ChartType
  const columns = parseColumns(content.columns)
  const rows = parseRows(content.rows)
  const xLabel = typeof content.xLabel === "string" ? content.xLabel : ""
  const yLabel = typeof content.yLabel === "string" ? content.yLabel : ""
  const showLegend = typeof content.showLegend === "boolean" ? content.showLegend : true
  const showGrid = typeof content.showGrid === "boolean" ? content.showGrid : true

  const colors = COLOR_SCHEMES[colorScheme] ?? COLOR_SCHEMES.Blue
  const chartData = rowsToChartData(columns, rows)
  const seriesKeys = columns.slice(1) // everything except first column (label)

  const setChartType = (t: ChartType) => onChange("chartType", t)

  const setColumn = (i: number, val: string) => {
    const next = [...columns]
    next[i] = val
    onChange("columns", next)
  }

  const setCell = (ri: number, ci: number, val: string) => {
    const next = rows.map((r, idx) => idx === ri ? [...r] : r)
    next[ri][ci] = val
    onChange("rows", next)
  }

  const addColumn = () => {
    onChange("columns", [...columns, `Series ${columns.length}`])
    onChange("rows", rows.map((r) => [...r, ""]))
  }

  const removeColumn = (i: number) => {
    if (columns.length <= 2) return
    onChange("columns", columns.filter((_, idx) => idx !== i))
    onChange("rows", rows.map((r) => r.filter((_, idx) => idx !== i)))
  }

  const addRow = () => {
    onChange("rows", [...rows, Array(columns.length).fill("")])
  }

  const removeRow = (i: number) => {
    onChange("rows", rows.filter((_, idx) => idx !== i))
  }

  return (
    <EditorSplitLayout
      sidebarWidthClassName="md:w-[28rem] xl:w-[32rem]"
      previewContentClassName="overflow-auto"
      sidebar={(
        <div className="flex h-full flex-col bg-white">
          <div className="flex shrink-0 border-b border-neutral-200 bg-white">
            {CHART_TYPES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setChartType(id)}
                className={[
                  "flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                  chartType === id
                    ? "border-b-2 border-[#9eb9da] text-[#233f5d]"
                    : "text-neutral-400 hover:text-neutral-700",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2 border-b border-neutral-100 px-4 py-3 overflow-x-auto">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Data</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={addColumn}
                  className="flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  <Plus size={10} /> Column
                </button>
                <button
                  type="button"
                  onClick={addRow}
                  className="flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  <Plus size={10} /> Row
                </button>
              </div>
            </div>

            <div className="min-w-full overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr>
                    {columns.map((col, ci) => (
                      <th key={ci} className="border border-neutral-200 bg-neutral-50 p-0">
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={col}
                            onChange={(e) => setColumn(ci, e.target.value)}
                            className="w-full min-w-[70px] bg-transparent px-3 py-2 text-[11px] font-semibold text-neutral-700 outline-none"
                          />
                          {ci > 1 && (
                            <button type="button" onClick={() => removeColumn(ci)} className="pr-1 text-neutral-300 hover:text-red-500">
                              <Trash2 size={10} />
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
                    <tr key={ri}>
                      {columns.map((_, ci) => (
                        <td key={ci} className="border border-neutral-200 p-0">
                          <input
                            type="text"
                            value={row[ci] ?? ""}
                            onChange={(e) => setCell(ri, ci, e.target.value)}
                            className="w-full min-w-[70px] bg-transparent px-3 py-2 text-[11px] text-neutral-700 outline-none hover:bg-neutral-50 focus:bg-white"
                            placeholder={ci === 0 ? "Label" : "0"}
                          />
                        </td>
                      ))}
                      <td className="border border-neutral-200 px-1">
                        <button type="button" onClick={() => removeRow(ri)} className="text-neutral-300 hover:text-red-500">
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 px-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-neutral-600">X-axis label</span>
                <input
                  type="text"
                  value={xLabel}
                  placeholder="e.g. Year"
                  onChange={(e) => onChange("xLabel", e.target.value)}
                  className="min-h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-neutral-600">Y-axis label</span>
                <input
                  type="text"
                  value={yLabel}
                  placeholder="e.g. °C"
                  onChange={(e) => onChange("yLabel", e.target.value)}
                  className="min-h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
                />
              </label>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-neutral-600">Color scheme</p>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(COLOR_SCHEMES).map(([name, scheme]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { setColorScheme(name); onChange("colorScheme", name) }}
                    className={[
                      "flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-2 text-[10px] font-medium transition-colors",
                      colorScheme === name ? "border-[#9eb9da] bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    <div className="flex gap-0.5">
                      {scheme.slice(0, 3).map((c, i) => (
                        <div key={i} style={{ background: c }} className="h-2.5 w-2.5 rounded-full" />
                      ))}
                    </div>
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => onChange("showLegend", e.target.checked)}
                  className="accent-neutral-900"
                />
                <span className="text-[11px] text-neutral-600">Show legend</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => onChange("showGrid", e.target.checked)}
                  className="accent-neutral-900"
                />
                <span className="text-[11px] text-neutral-600">Show grid</span>
              </label>
            </div>
          </div>
        </div>
      )}
      preview={(
        <div className="flex h-full min-h-0 items-center justify-center px-6 py-6 md:px-8">
          <EditorPreviewFrame
            cardType="chart"
            title={title}
            onTitleChange={(next) => onChange("title", next)}
            className="w-full max-w-5xl"
            bodyClassName="h-[420px] p-5"
          >
              <ResponsiveChartEditorPreview
                chartType={chartType}
                chartData={chartData}
                columns={columns}
                seriesKeys={seriesKeys}
                colors={colors}
                showLegend={showLegend}
                showGrid={showGrid}
                xLabel={xLabel}
                yLabel={yLabel}
              />
          </EditorPreviewFrame>
        </div>
      )}
    />
  )
}
