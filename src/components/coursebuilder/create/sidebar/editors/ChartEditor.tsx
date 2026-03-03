"use client"

import { useState } from "react"
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts"
import { Plus, Trash2 } from "lucide-react"

interface ChartEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

type ChartType = "line" | "bar" | "area" | "scatter" | "pie"

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

  const renderChart = () => {
    if (chartData.length === 0) return <p className="text-[11px] text-neutral-400 text-center py-8">Add data rows to see chart</p>

    const commonProps = {
      data: chartData,
      margin: { top: 8, right: 16, left: 0, bottom: 8 },
    }

    switch (chartType) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis dataKey={columns[0]} tick={{ fontSize: 10 }} />
            <YAxis label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10 } } : undefined} tick={{ fontSize: 10 }} />
            <Tooltip />
            {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {seriesKeys.map((k, i) => <Bar key={k} dataKey={k} fill={colors[i % colors.length]} />)}
          </BarChart>
        )

      case "area":
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis dataKey={columns[0]} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {seriesKeys.map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} fill={colors[i % colors.length] + "33"} />
            ))}
          </AreaChart>
        )

      case "scatter":
        return (
          <ScatterChart margin={commonProps.margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis dataKey={columns[0]} name={xLabel || columns[0]} tick={{ fontSize: 10 }} />
            <YAxis dataKey={seriesKeys[0]} name={yLabel || seriesKeys[0]} tick={{ fontSize: 10 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
            <Scatter name={seriesKeys[0]} data={chartData} fill={colors[0]} />
          </ScatterChart>
        )

      case "pie":
        return (
          <PieChart>
            <Pie
              data={chartData.map((d) => ({ name: (d as Record<string, unknown>)[columns[0]] as string, value: Number((d as Record<string, unknown>)[seriesKeys[0]] ?? 0) }))}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip />
            {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          </PieChart>
        )

      default: // line
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis dataKey={columns[0]} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {seriesKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} dot={false} strokeWidth={2} />)}
          </LineChart>
        )
    }
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      {/* Chart type tabs */}
      <div className="flex shrink-0 border-b border-neutral-200 bg-white">
        {CHART_TYPES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setChartType(id)}
            className={[
              "flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
              chartType === id
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-400 hover:text-neutral-700",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Live chart preview */}
      <div className="px-4 py-4 border-b border-neutral-100 bg-neutral-50">
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {renderChart() as any}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data table */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-2 overflow-x-auto">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Data</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={addColumn}
              className="flex items-center gap-1 border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50"
            >
              <Plus size={10} /> Column
            </button>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50"
            >
              <Plus size={10} /> Row
            </button>
          </div>
        </div>

        <div className="min-w-full overflow-x-auto">
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
                        className="w-full min-w-[70px] bg-transparent px-2 py-1.5 text-[11px] font-semibold text-neutral-700 outline-none"
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
                        className="w-full min-w-[70px] bg-transparent px-2 py-1.5 text-[11px] text-neutral-700 outline-none hover:bg-neutral-50 focus:bg-white"
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

      {/* Labels & options */}
      <div className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">X-axis label</span>
            <input
              type="text"
              value={xLabel}
              placeholder="e.g. Year"
              onChange={(e) => onChange("xLabel", e.target.value)}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Y-axis label</span>
            <input
              type="text"
              value={yLabel}
              placeholder="e.g. °C"
              onChange={(e) => onChange("yLabel", e.target.value)}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
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
                  "flex items-center gap-1.5 border px-2 py-1 text-[10px] font-medium transition-colors",
                  colorScheme === name ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
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
  )
}
