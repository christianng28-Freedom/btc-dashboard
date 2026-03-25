import { SCORE_RANGES } from './constants'

/**
 * Return a hex color based on a 0-100 score.
 */
export function scoreToColor(score: number): string {
  const range = SCORE_RANGES.find((r) => score >= r.min && score <= r.max)
  return range?.color ?? '#f59e0b'
}

/**
 * Return green for positive change, red for negative.
 */
export function changeToColor(change: number): string {
  return change >= 0 ? '#22c55e' : '#ef4444'
}

/**
 * Linear interpolation between two hex colors.
 * t should be 0–1.
 */
export function interpolateColor(color1: string, color2: string, t: number): string {
  const hex = (c: string) => {
    const h = c.replace('#', '')
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ] as [number, number, number]
  }

  const [r1, g1, b1] = hex(color1)
  const [r2, g2, b2] = hex(color2)

  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Return a heatmap color based on price relative to the 200-week MA.
 * Below MA (cheap): green. Highly above MA (expensive): red.
 */
export function priceToHeatmapColor(price: number, ma200w: number): string {
  if (ma200w <= 0) return '#f59e0b'
  const ratio = price / ma200w
  // ratio < 1 = below MA => green (#22c55e)
  // ratio 1..5 => transition green -> red (#ef4444)
  if (ratio <= 1) return '#22c55e'
  const t = Math.min((ratio - 1) / 4, 1)
  return interpolateColor('#22c55e', '#ef4444', t)
}
