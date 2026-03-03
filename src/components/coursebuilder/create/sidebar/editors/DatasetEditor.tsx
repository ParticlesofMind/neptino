"use client"

import { Database } from "lucide-react"

interface DatasetEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export function DatasetEditor({ content, onChange }: DatasetEditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const source = typeof content.source === "string" ? content.source : ""
  const schemaVersion = typeof content.schemaVersion === "string" ? content.schemaVersion : "v1"
  const rows = typeof content.rows === "number" ? content.rows : 0
  const columns = typeof content.columns === "number" ? content.columns : 0
  const format = typeof content.format === "string" ? content.format : "csv"
  const refreshCadence = typeof content.refreshCadence === "string" ? content.refreshCadence : "manual"
  const description = typeof content.description === "string" ? content.description : ""

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      <div className="flex items-center justify-center gap-3 border-b border-neutral-100 bg-neutral-50 py-10">
        <Database size={36} className="text-neutral-300" />
        <div>
          <p className="text-[13px] font-semibold text-neutral-700">{title || "Dataset"}</p>
          {rows > 0 && <p className="text-[11px] text-neutral-400">{rows.toLocaleString()} rows · {columns} columns</p>}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Title</span>
          <input type="text" value={title} onChange={(e) => onChange("title", e.target.value)}
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400" />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Description</span>
          <textarea value={description} rows={3} onChange={(e) => onChange("description", e.target.value)}
            placeholder="What does this dataset contain?"
            className="w-full resize-none border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400" />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Source URL or table name</span>
          <input type="text" value={source} onChange={(e) => onChange("source", e.target.value)}
            placeholder="https://… or database.table_name"
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Format</span>
            <select value={format} onChange={(e) => onChange("format", e.target.value)}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none">
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="parquet">Parquet</option>
              <option value="sql">SQL table</option>
              <option value="api">API endpoint</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Schema version</span>
            <input type="text" value={schemaVersion} onChange={(e) => onChange("schemaVersion", e.target.value)}
              placeholder="v1"
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Row count</span>
            <input type="number" value={rows} min={0} onChange={(e) => onChange("rows", Number(e.target.value))}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400" />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Columns</span>
            <input type="number" value={columns} min={0} onChange={(e) => onChange("columns", Number(e.target.value))}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400" />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Refresh cadence</span>
          <select value={refreshCadence} onChange={(e) => onChange("refreshCadence", e.target.value)}
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none">
            <option value="manual">Manual</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
      </div>
    </div>
  )
}
