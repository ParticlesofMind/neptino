import { ResponsiveContainer } from "recharts"
import { renderAdvancedChart } from "./chart-editor-preview-advanced"
import { renderBasicChart } from "./chart-editor-preview-basic"
import type { ChartEditorPreviewProps, ChartType } from "./chart-editor-preview-types"

export type { ChartType } from "./chart-editor-preview-types"

const ADVANCED_TYPES = new Set<ChartType>([
  "histogram",
  "box",
  "heatmap",
  "bubble",
  "treemap",
  "funnel",
  "sankey",
  "normal-distribution",
])

export function ChartEditorPreview(props: ChartEditorPreviewProps) {
  const { chartType, chartData } = props

  if (chartData.length === 0) {
    return <p className="py-8 text-center text-[11px] text-neutral-400">Add data rows to see chart</p>
  }

  const commonProps = {
    data: chartData,
    margin: { top: 8, right: 16, left: 0, bottom: 8 },
  }

  if (ADVANCED_TYPES.has(chartType)) {
    return renderAdvancedChart(props, commonProps)
  }

  return renderBasicChart(props, commonProps)
}

export function ResponsiveChartEditorPreview(props: ChartEditorPreviewProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartEditorPreview {...props} />
    </ResponsiveContainer>
  )
}
