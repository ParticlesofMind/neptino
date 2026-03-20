import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Sankey,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"
import { getFirstSeries, getSeriesValues, interpolateHex, quantile, toNumber } from "./chart-editor-preview-helpers"
import type { ChartEditorPreviewProps } from "./chart-editor-preview-types"

interface CommonProps {
  data: object[]
  margin: { top: number; right: number; left: number; bottom: number }
}

export function renderAdvancedChart(props: ChartEditorPreviewProps, commonProps: CommonProps) {
  const { chartType, chartData, columns, seriesKeys, colors, showGrid, showLegend, xLabel, yLabel } = props

  switch (chartType) {
    case "histogram": {
      const seriesKey = getFirstSeries(seriesKeys)
      const values = getSeriesValues(chartData, seriesKey)
      if (values.length === 0) return <p className="py-8 text-center text-[11px] text-neutral-400">Need numeric values for a histogram</p>
      const min = Math.min(...values)
      const max = Math.max(...values)
      const range = Math.max(1, max - min)
      const binCount = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(values.length))))
      const binSize = range / binCount
      const bins = Array.from({ length: binCount }, (_, i) => {
        const start = min + i * binSize
        const end = i === binCount - 1 ? max : start + binSize
        const count = values.filter((value) => (
          i === binCount - 1 ? value >= start && value <= end : value >= start && value < end
        )).length
        return { bucket: `${start.toFixed(1)}-${end.toFixed(1)}`, count }
      })

      return (
        <BarChart data={bins} margin={commonProps.margin}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis dataKey="bucket" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={42} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="count" fill={colors[0]} />
        </BarChart>
      )
    }

    case "box": {
      const seriesKey = getFirstSeries(seriesKeys)
      const values = getSeriesValues(chartData, seriesKey).sort((a, b) => a - b)
      if (values.length < 2) return <p className="py-8 text-center text-[11px] text-neutral-400">Need at least 2 values for a box plot</p>
      const min = values[0]
      const q1 = quantile(values, 0.25)
      const median = quantile(values, 0.5)
      const q3 = quantile(values, 0.75)
      const max = values[values.length - 1]

      const width = 420
      const height = 260
      const left = 40
      const right = width - 30
      const y = 130
      const scaleX = (value: number) => (max === min ? (left + right) / 2 : left + ((value - min) / (max - min)) * (right - left))

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          <text x={left} y={30} fontSize="11" fill="#6b7280">{seriesKey || "Series"}</text>
          <line x1={scaleX(min)} y1={y} x2={scaleX(q1)} y2={y} stroke="#9ca3af" strokeWidth="2" />
          <line x1={scaleX(q3)} y1={y} x2={scaleX(max)} y2={y} stroke="#9ca3af" strokeWidth="2" />
          <rect x={Math.min(scaleX(q1), scaleX(q3))} y={y - 30} width={Math.max(2, Math.abs(scaleX(q3) - scaleX(q1)))} height={60} fill={`${colors[0]}33`} stroke={colors[0]} strokeWidth="2" />
          <line x1={scaleX(median)} y1={y - 30} x2={scaleX(median)} y2={y + 30} stroke={colors[1] ?? colors[0]} strokeWidth="3" />
          <line x1={scaleX(min)} y1={y - 16} x2={scaleX(min)} y2={y + 16} stroke="#9ca3af" strokeWidth="2" />
          <line x1={scaleX(max)} y1={y - 16} x2={scaleX(max)} y2={y + 16} stroke="#9ca3af" strokeWidth="2" />
          <text x={scaleX(min)} y={220} fontSize="10" fill="#6b7280" textAnchor="middle">Min {min.toFixed(1)}</text>
          <text x={scaleX(q1)} y={220} fontSize="10" fill="#6b7280" textAnchor="middle">Q1 {q1.toFixed(1)}</text>
          <text x={scaleX(median)} y={220} fontSize="10" fill="#6b7280" textAnchor="middle">Med {median.toFixed(1)}</text>
          <text x={scaleX(q3)} y={220} fontSize="10" fill="#6b7280" textAnchor="middle">Q3 {q3.toFixed(1)}</text>
          <text x={scaleX(max)} y={220} fontSize="10" fill="#6b7280" textAnchor="middle">Max {max.toFixed(1)}</text>
        </svg>
      )
    }

    case "heatmap": {
      if (seriesKeys.length === 0) return <p className="py-8 text-center text-[11px] text-neutral-400">Need at least 1 numeric series for a heatmap</p>
      const values = chartData.flatMap((datum) => seriesKeys.map((key) => toNumber((datum as Record<string, unknown>)[key])))
      const min = Math.min(...values)
      const max = Math.max(...values)
      const width = 440
      const height = 280
      const padLeft = 70
      const padTop = 32
      const padRight = 16
      const padBottom = 24
      const cols = seriesKeys.length
      const rows = chartData.length
      const cellWidth = (width - padLeft - padRight) / Math.max(1, cols)
      const cellHeight = (height - padTop - padBottom) / Math.max(1, rows)

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
          {seriesKeys.map((key, ci) => (
            <text key={key} x={padLeft + ci * cellWidth + cellWidth / 2} y={18} fontSize="10" fill="#6b7280" textAnchor="middle">{key}</text>
          ))}
          {chartData.map((datum, ri) => {
            const rowLabel = String((datum as Record<string, unknown>)[columns[0]] ?? `R${ri + 1}`)
            return (
              <g key={`row-${ri}`}>
                <text x={padLeft - 8} y={padTop + ri * cellHeight + cellHeight * 0.62} fontSize="10" fill="#6b7280" textAnchor="end">{rowLabel}</text>
                {seriesKeys.map((key, ci) => {
                  const value = toNumber((datum as Record<string, unknown>)[key])
                  const t = max === min ? 0.5 : (value - min) / (max - min)
                  return <rect key={`${ri}-${ci}`} x={padLeft + ci * cellWidth} y={padTop + ri * cellHeight} width={Math.max(1, cellWidth - 1)} height={Math.max(1, cellHeight - 1)} fill={interpolateHex("#eef2ff", colors[0], t)} />
                })}
              </g>
            )
          })}
        </svg>
      )
    }

    case "bubble": {
      const xKey = seriesKeys[0]
      const yKey = seriesKeys[1] ?? seriesKeys[0]
      const zKey = seriesKeys[2] ?? seriesKeys[1] ?? seriesKeys[0]
      const bubbleData = chartData.map((datum, index) => {
        const record = datum as Record<string, unknown>
        return {
          x: toNumber(record[xKey]) || index + 1,
          y: toNumber(record[yKey]),
          z: Math.abs(toNumber(record[zKey])) || 1,
          name: String(record[columns[0]] ?? `${index + 1}`),
        }
      })

      return (
        <ScatterChart margin={commonProps.margin}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis type="number" dataKey="x" name={xLabel || xKey || "X"} tick={{ fontSize: 10 }} />
          <YAxis type="number" dataKey="y" name={yLabel || yKey || "Y"} tick={{ fontSize: 10 }} />
          <ZAxis type="number" dataKey="z" range={[60, 460]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          <Scatter name={zKey || "Bubble"} data={bubbleData} fill={colors[0]} />
        </ScatterChart>
      )
    }

    case "treemap": {
      const seriesKey = getFirstSeries(seriesKeys)
      if (!seriesKey) return <p className="py-8 text-center text-[11px] text-neutral-400">Need at least 1 numeric series for a treemap</p>
      const treeData = chartData
        .map((datum, index) => {
          const rawName = String((datum as Record<string, unknown>)[columns[0]] ?? "")
          const name = rawName.trim().length > 0 ? rawName : `Item ${index + 1}`
          return {
            id: `treemap-item-${index}`,
            name,
            size: Math.max(0, toNumber((datum as Record<string, unknown>)[seriesKey])),
          }
        })
        .filter((node) => node.size > 0)

      if (treeData.length === 0) {
        return <p className="py-8 text-center text-[11px] text-neutral-400">Need positive numeric values for a treemap</p>
      }

      return <Treemap data={treeData} dataKey="size" stroke="#fff" fill={colors[0]} isAnimationActive={false} />
    }

    case "funnel": {
      const seriesKey = getFirstSeries(seriesKeys)
      if (!seriesKey) return <p className="py-8 text-center text-[11px] text-neutral-400">Need at least 1 numeric series for a funnel chart</p>
      const funnelData = chartData.map((datum) => ({
        name: String((datum as Record<string, unknown>)[columns[0]] ?? "Stage"),
        value: Math.max(0, toNumber((datum as Record<string, unknown>)[seriesKey])),
      }))
      return (
        <FunnelChart>
          <Tooltip />
          <Funnel dataKey="value" data={funnelData} isAnimationActive>
            <LabelList position="right" fill="#6b7280" stroke="none" dataKey="name" />
            {funnelData.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
          </Funnel>
        </FunnelChart>
      )
    }

    case "sankey": {
      if (chartData.length < 2) return <p className="py-8 text-center text-[11px] text-neutral-400">Need at least 2 rows for a Sankey diagram</p>
      const seriesKey = getFirstSeries(seriesKeys)
      const labels = chartData.map((datum, index) => String((datum as Record<string, unknown>)[columns[0]] ?? `Node ${index + 1}`))
      const nodes = labels.map((name) => ({ name }))
      const links = labels.slice(0, -1).map((_, index) => ({
        source: index,
        target: index + 1,
        value: Math.max(1, Math.abs(toNumber((chartData[index] as Record<string, unknown>)[seriesKey]))),
      }))
      return <Sankey data={{ nodes, links }} node={{ stroke: "#d4d4d8", strokeWidth: 1, fill: colors[0] }} link={{ stroke: colors[1] ?? colors[0] }} />
    }

    case "normal-distribution": {
      const validSeries = seriesKeys
        .map((key) => ({ key, values: getSeriesValues(chartData, key) }))
        .filter((series) => series.values.length >= 2)

      if (validSeries.length === 0) {
        return <p className="py-8 text-center text-[11px] text-neutral-400">Need at least 2 values per series for normal distribution curves</p>
      }

      const stats = validSeries.map((series) => {
        const mean = series.values.reduce((sum, value) => sum + value, 0) / series.values.length
        const variance = series.values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / series.values.length
        const stdDev = Math.sqrt(variance) || 1
        return { key: series.key, mean, stdDev }
      })

      const globalStart = Math.min(...stats.map((series) => series.mean - series.stdDev * 3))
      const globalEnd = Math.max(...stats.map((series) => series.mean + series.stdDev * 3))
      const step = (globalEnd - globalStart) / 60

      const normalData = Array.from({ length: 61 }, (_, index) => {
        const x = globalStart + index * step
        const datum: Record<string, number> = { x: Number(x.toFixed(2)) }

        stats.forEach((series) => {
          const z = (x - series.mean) / series.stdDev
          const y = (1 / (series.stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z)
          datum[series.key] = y
        })

        return datum
      })

      return (
        <LineChart data={normalData} margin={commonProps.margin}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis dataKey="x" type="number" tick={{ fontSize: 10 }} name={xLabel || "Value"} />
          <YAxis tick={{ fontSize: 10 }} name={yLabel || "Density"} />
          <Tooltip />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {stats.map((series, index) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              stroke={colors[index % colors.length]}
              dot={false}
              strokeWidth={2.5}
            />
          ))}
        </LineChart>
      )
    }

    default:
      return null
  }
}
