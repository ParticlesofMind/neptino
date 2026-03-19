import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { getFirstSeries, toNumber } from "./chart-editor-preview-helpers"
import type { ChartEditorPreviewProps } from "./chart-editor-preview-types"

interface CommonProps {
  data: object[]
  margin: { top: number; right: number; left: number; bottom: number }
}

export function renderBasicChart(props: ChartEditorPreviewProps, commonProps: CommonProps) {
  const { chartType, chartData, columns, seriesKeys, colors, showGrid, showLegend, xLabel, yLabel } = props

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

    case "stacked-bar":
      return (
        <BarChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis dataKey={columns[0]} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {seriesKeys.map((key, index) => (
            <Bar key={key} dataKey={key} stackId="stack" fill={colors[index % colors.length]} />
          ))}
        </BarChart>
      )

    case "stacked-bar-100": {
      const normalized = chartData.map((datum) => {
        const row = datum as Record<string, unknown>
        const total = seriesKeys.reduce((sum, key) => sum + Math.max(0, toNumber(row[key])), 0)
        const next: Record<string, unknown> = { [columns[0]]: row[columns[0]] }
        seriesKeys.forEach((key) => {
          next[key] = total > 0 ? (Math.max(0, toNumber(row[key])) / total) * 100 : 0
        })
        return next
      })

      return (
        <BarChart data={normalized} margin={commonProps.margin}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis dataKey={columns[0]} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
          <Tooltip formatter={(value: number) => `${Number(value).toFixed(1)}%`} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {seriesKeys.map((key, index) => (
            <Bar key={key} dataKey={key} stackId="stack100" fill={colors[index % colors.length]} />
          ))}
        </BarChart>
      )
    }

    case "radar": {
      const seriesKey = getFirstSeries(seriesKeys)
      if (!seriesKey) return <p className="py-8 text-center text-[11px] text-neutral-400">Need at least 1 numeric series for a radar chart</p>
      const radarData = chartData.map((datum) => {
        const row = datum as Record<string, unknown>
        return { subject: String(row[columns[0]] ?? ""), value: toNumber(row[seriesKey]) }
      })

      return (
        <RadarChart data={radarData} margin={commonProps.margin}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis tick={{ fontSize: 9 }} />
          <Radar name={seriesKey} dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.28} />
          <Tooltip />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
        </RadarChart>
      )
    }

    case "waterfall": {
      const seriesKey = getFirstSeries(seriesKeys)
      if (!seriesKey) return <p className="py-8 text-center text-[11px] text-neutral-400">Need at least 1 numeric series for a waterfall chart</p>
      let cumulative = 0
      const waterfallData = chartData.map((datum) => {
        const row = datum as Record<string, unknown>
        const delta = toNumber(row[seriesKey])
        const start = cumulative
        cumulative += delta
        return { label: String(row[columns[0]] ?? ""), start, delta, total: cumulative, positive: delta >= 0 }
      })

      return (
        <ComposedChart data={waterfallData} margin={commonProps.margin}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="start" stackId="wf" fill="transparent" />
          <Bar dataKey="delta" stackId="wf">
            {waterfallData.map((entry, index) => (
              <Cell key={`wf-${index}`} fill={entry.positive ? colors[0] : "#b87070"} />
            ))}
          </Bar>
          <Line type="monotone" dataKey="total" stroke={colors[1] ?? colors[0]} dot={false} strokeWidth={2} />
        </ComposedChart>
      )
    }

    case "line":
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
