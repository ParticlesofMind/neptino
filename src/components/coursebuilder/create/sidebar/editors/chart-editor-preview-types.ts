export type ChartType =
  | "line"
  | "bar"
  | "area"
  | "scatter"
  | "pie"
  | "histogram"
  | "box"
  | "heatmap"
  | "bubble"
  | "stacked-bar"
  | "stacked-bar-100"
  | "radar"
  | "waterfall"
  | "treemap"
  | "funnel"
  | "sankey"
  | "normal-distribution"

export interface ChartEditorPreviewProps {
  chartType: ChartType
  chartData: object[]
  columns: string[]
  seriesKeys: string[]
  colors: string[]
  showLegend: boolean
  showGrid: boolean
  xLabel: string
  yLabel: string
}
