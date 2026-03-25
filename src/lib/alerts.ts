export type AlertPriority = 'critical' | 'warning' | 'info'

export interface Alert {
  id: string
  priority: AlertPriority
  title: string
  detail: string
  value?: string
}

export interface AlertInputs {
  rsi?: number
  fearGreed?: number
  fearGreedLabel?: string
  fundingRate?: number
  oiDeviationPct?: number
  piCycleGapPct?: number | null
  price?: number
  ma200?: number
  ma50?: number
  stochRsiK?: number
}

const PRIORITY_ORDER: Record<AlertPriority, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

/**
 * Evaluate alert rules from current market inputs.
 * Returns up to 5 alerts sorted by priority.
 */
export function evaluateAlerts(inputs: AlertInputs): Alert[] {
  const alerts: Alert[] = []

  const { rsi, fearGreed, fearGreedLabel, fundingRate, oiDeviationPct, piCycleGapPct, price, ma200, ma50, stochRsiK } = inputs

  // ── RSI extremes ────────────────────────────────────────────────
  if (rsi !== undefined) {
    if (rsi >= 80) {
      alerts.push({
        id: 'rsi-overbought',
        priority: 'critical',
        title: 'RSI Severely Overbought',
        detail: 'RSI above 80 — historically precedes corrections',
        value: rsi.toFixed(1),
      })
    } else if (rsi >= 70) {
      alerts.push({
        id: 'rsi-high',
        priority: 'warning',
        title: 'RSI Overbought',
        detail: 'RSI entering overbought territory',
        value: rsi.toFixed(1),
      })
    } else if (rsi <= 20) {
      alerts.push({
        id: 'rsi-oversold',
        priority: 'critical',
        title: 'RSI Extremely Oversold',
        detail: 'RSI below 20 — rare buying opportunity signal',
        value: rsi.toFixed(1),
      })
    } else if (rsi <= 30) {
      alerts.push({
        id: 'rsi-low',
        priority: 'warning',
        title: 'RSI Oversold',
        detail: 'RSI in oversold zone — potential bounce zone',
        value: rsi.toFixed(1),
      })
    }
  }

  // ── Fear & Greed extremes ───────────────────────────────────────
  if (fearGreed !== undefined) {
    if (fearGreed >= 80) {
      alerts.push({
        id: 'fg-extreme-greed',
        priority: 'critical',
        title: 'Extreme Greed',
        detail: `Fear & Greed at ${fearGreedLabel ?? 'Extreme Greed'} — sentiment historically precedes tops`,
        value: fearGreed.toString(),
      })
    } else if (fearGreed >= 70) {
      alerts.push({
        id: 'fg-greed',
        priority: 'warning',
        title: 'High Greed Sentiment',
        detail: 'Market sentiment elevated — consider risk management',
        value: fearGreed.toString(),
      })
    } else if (fearGreed <= 15) {
      alerts.push({
        id: 'fg-extreme-fear',
        priority: 'critical',
        title: 'Extreme Fear',
        detail: `Fear & Greed at ${fearGreedLabel ?? 'Extreme Fear'} — historically strong buy zone`,
        value: fearGreed.toString(),
      })
    } else if (fearGreed <= 30) {
      alerts.push({
        id: 'fg-fear',
        priority: 'warning',
        title: 'High Fear Sentiment',
        detail: 'Market fear elevated — potential accumulation opportunity',
        value: fearGreed.toString(),
      })
    }
  }

  // ── Funding Rate ────────────────────────────────────────────────
  if (fundingRate !== undefined) {
    if (fundingRate >= 0.0005) {
      alerts.push({
        id: 'funding-extreme',
        priority: 'critical',
        title: 'Extreme Funding Rate',
        detail: 'Perpetual funding rate dangerously elevated — overleveraged longs at risk',
        value: (fundingRate * 100).toFixed(4) + '%',
      })
    } else if (fundingRate >= 0.0003) {
      alerts.push({
        id: 'funding-high',
        priority: 'warning',
        title: 'Elevated Funding Rate',
        detail: 'Funding rate above 0.03% — leverage building in futures market',
        value: (fundingRate * 100).toFixed(4) + '%',
      })
    } else if (fundingRate < -0.0001) {
      alerts.push({
        id: 'funding-negative',
        priority: 'info',
        title: 'Negative Funding Rate',
        detail: 'Shorts paying longs — market in backwardation (historically bullish)',
        value: (fundingRate * 100).toFixed(4) + '%',
      })
    }
  }

  // ── Open Interest ───────────────────────────────────────────────
  if (oiDeviationPct !== undefined) {
    if (oiDeviationPct >= 30) {
      alerts.push({
        id: 'oi-very-elevated',
        priority: 'warning',
        title: 'Open Interest Very Elevated',
        detail: `OI is ${oiDeviationPct.toFixed(0)}% above 90d MA — heightened liquidation risk`,
        value: `+${oiDeviationPct.toFixed(0)}%`,
      })
    } else if (oiDeviationPct >= 20) {
      alerts.push({
        id: 'oi-elevated',
        priority: 'info',
        title: 'Open Interest Elevated',
        detail: `OI is ${oiDeviationPct.toFixed(0)}% above 90d MA — watch for leverage unwind`,
        value: `+${oiDeviationPct.toFixed(0)}%`,
      })
    }
  }

  // ── Pi Cycle ────────────────────────────────────────────────────
  if (piCycleGapPct !== null && piCycleGapPct !== undefined) {
    if (piCycleGapPct <= 2) {
      alerts.push({
        id: 'pi-cycle-near',
        priority: 'critical',
        title: 'Pi Cycle Top Alert',
        detail: `111DMA is within ${piCycleGapPct.toFixed(1)}% of 350DMAx2 — historically accurate top signal`,
        value: `${piCycleGapPct.toFixed(1)}% gap`,
      })
    } else if (piCycleGapPct <= 10) {
      alerts.push({
        id: 'pi-cycle-warning',
        priority: 'warning',
        title: 'Pi Cycle Converging',
        detail: `Pi Cycle gap at ${piCycleGapPct.toFixed(1)}% — approaching potential top signal zone`,
        value: `${piCycleGapPct.toFixed(1)}% gap`,
      })
    }
  }

  // ── Price vs 200 SMA ────────────────────────────────────────────
  if (price !== undefined && ma200 !== undefined && ma200 > 0) {
    const devPct = ((price - ma200) / ma200) * 100
    if (devPct <= -20) {
      alerts.push({
        id: 'price-below-200',
        priority: 'warning',
        title: 'Price Below 200 SMA',
        detail: `BTC is ${Math.abs(devPct).toFixed(0)}% below the 200-day SMA — bear market territory`,
        value: `–${Math.abs(devPct).toFixed(0)}%`,
      })
    } else if (devPct >= 100) {
      alerts.push({
        id: 'price-far-above-200',
        priority: 'info',
        title: 'Price Extended Above 200 SMA',
        detail: `BTC is ${devPct.toFixed(0)}% above 200d SMA — historically elevated`,
        value: `+${devPct.toFixed(0)}%`,
      })
    }
  }

  // ── StochRSI extremes ───────────────────────────────────────────
  if (stochRsiK !== undefined) {
    if (stochRsiK >= 90) {
      alerts.push({
        id: 'stoch-overbought',
        priority: 'info',
        title: 'StochRSI Overbought',
        detail: 'Stochastic RSI %K above 90 — short-term momentum overextended',
        value: stochRsiK.toFixed(0),
      })
    } else if (stochRsiK <= 10) {
      alerts.push({
        id: 'stoch-oversold',
        priority: 'info',
        title: 'StochRSI Oversold',
        detail: 'Stochastic RSI %K below 10 — short-term momentum extremely compressed',
        value: stochRsiK.toFixed(0),
      })
    }
  }

  // Sort by priority, take top 5
  return alerts
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 5)
}
