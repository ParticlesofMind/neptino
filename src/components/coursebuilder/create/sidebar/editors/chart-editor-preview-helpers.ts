export function toNumber(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function getFirstSeries(seriesKeys: string[]): string {
  return seriesKeys[0] ?? ""
}

export function getSeriesValues(chartData: object[], seriesKey: string): number[] {
  if (!seriesKey) return []
  return chartData.map((datum) => toNumber((datum as Record<string, unknown>)[seriesKey]))
}

export function quantile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0
  const index = (sortedValues.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedValues[lower]
  const weight = index - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

export function interpolateHex(startHex: string, endHex: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  const parse = (hex: string) => {
    const value = hex.replace("#", "")
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    }
  }
  const from = parse(startHex)
  const to = parse(endHex)
  const mix = (a: number, b: number) => Math.round(a + (b - a) * clamped)
  const r = mix(from.r, to.r).toString(16).padStart(2, "0")
  const g = mix(from.g, to.g).toString(16).padStart(2, "0")
  const b = mix(from.b, to.b).toString(16).padStart(2, "0")
  return `#${r}${g}${b}`
}
