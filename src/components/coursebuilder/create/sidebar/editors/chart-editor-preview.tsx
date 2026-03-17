import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type ChartType = "line" | "bar" | "area" | "scatter" | "pie"

interface ChartEditorPreviewProps {
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

export function ChartEditorPreview({
  chartType,
  chartData,
  columns,
  seriesKeys,
  colors,
  showLegend,
  showGrid,
  xLabel,
  yLabel,
}: ChartEditorPreviewProps) {
  if (chartData.length === 0) {
    return <p className="py-8 text-center text-[11px] text-neutral-400">Add data rows to see chart</p>
  }

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
          {seriesKeys.map((key, index) => <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />)}
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
          {seriesKeys.map((key, index) => (
            <Area key={key} type="monotone" dataKey={key} stroke={colors[index % colors.length]} fill={colors[index % colors.length] + "33"} />
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

    case "pie": {
      const pieData = chartData.map((datum) => ({
        name: (datum as Record<string, unknown>)[columns[0]] as string,
        value: Number((datum as Record<string, unknown>)[seriesKeys[0]] ?? 0),
      }))

      return (
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
          </Pie>
          <Tooltip />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
        </PieChart>
      )
    }

    default:
      return (
        <LineChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis dataKey={columns[0]} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {seriesKeys.map((key, index) => (
            <Line key={key} type="monotone" dataKey={key} stroke={colors[index % colors.length]} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      )
  }
}

export function ResponsiveChartEditorPreview(props: ChartEditorPreviewProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartEditorPreview {...props} />
    </ResponsiveContainer>
  )
}