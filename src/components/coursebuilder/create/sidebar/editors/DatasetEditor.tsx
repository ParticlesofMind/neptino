"use client"

import { EditorSplitLayout } from "./editor-split-layout"
import { GenericEditorPreview } from "./generic-editor-preview"
import {
  StudioInput,
  StudioNumberInput,
  StudioSection,
  StudioSelect,
  StudioTextarea,
} from "./studio-primitives"

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
    <EditorSplitLayout
      sidebar={(
        <div className="flex h-full flex-col overflow-auto bg-white">
          <StudioSection className="pt-4" noBorder>
            <StudioInput
              label="Title"
              value={title}
              onChange={(e) => onChange("title", e.target.value)}
            />
            <StudioTextarea
              label="Description"
              value={description}
              rows={3}
              placeholder="What does this dataset contain?"
              onChange={(e) => onChange("description", e.target.value)}
            />
            <StudioInput
              label="Source URL or table name"
              value={source}
              placeholder="https://... or database.table_name"
              onChange={(e) => onChange("source", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <StudioSelect
                label="Format"
                value={format}
                onChange={(e) => onChange("format", e.target.value)}
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="parquet">Parquet</option>
                <option value="sql">SQL table</option>
                <option value="api">API endpoint</option>
              </StudioSelect>
              <StudioInput
                label="Schema version"
                value={schemaVersion}
                placeholder="v1"
                onChange={(e) => onChange("schemaVersion", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StudioNumberInput
                label="Row count"
                value={rows}
                min={0}
                onChange={(value) => onChange("rows", value)}
              />
              <StudioNumberInput
                label="Columns"
                value={columns}
                min={0}
                onChange={(value) => onChange("columns", value)}
              />
            </div>

            <StudioSelect
              label="Refresh cadence"
              value={refreshCadence}
              onChange={(e) => onChange("refreshCadence", e.target.value)}
            >
              <option value="manual">Manual</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </StudioSelect>
          </StudioSection>
        </div>
      )}
      preview={<GenericEditorPreview cardType="dataset" content={content} onTitleChange={(next) => onChange("title", next)} />}
    />
  )
}
