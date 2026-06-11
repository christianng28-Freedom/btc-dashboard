import { useMemo } from 'react'
import type { OHLCV } from '@/lib/types'
import { calcEMA } from '@/lib/calc/ema'

export type StrategyId = 'ema21x55' | 'ema21x200' | 'ema55x200' | 'tripleEma'
export type BacktestPeriod = '1y' | '3y' | '5y' | 'all'

export interface Strategy {
  id: StrategyId
  name: string
  description: string
}

export const STRATEGIES: Strategy[] = [
  { id: 'ema21x55', name: '21/55 EMA Cross', description: 'Fast crossover, more trades' },
  { id: 'ema21x200', name: '21/200 EMA Cross', description: 'Trend confirmation' },
  { id: 'ema55x200', name: '55/200 EMA Cross', description: 'Slower, fewer trades' },
  { id: 'tripleEma', name: 'Triple EMA Align', description: '21 > 55 > 200 alignment' },
]

export const PERIODS: { id: BacktestPeriod; label: string; days: number | null }[] = [
  { id: '1y', label: '1Y', days: 365 },
  { id: '3y', label: '3Y', days: 365 * 3 },
  { id: '5y', label: '5Y', days: 365 * 5 },
  { id: 'all', label: 'All', days: null },
]

/** Per-side trading cost (exchange taker fee + slippage allowance) */
export const FEE_RATE = 0.001 // 0.1%

export interface Trade {
  entryPrice: number
  exitPrice: number
  entryTime: number
  exitTime: number
  pnl: number // % return of the trade, net of fees
  profit: number // dollar P&L of the trade on compounded equity, net of fees
}

export interface BacktestSignal {
  time: number
  side: 'buy' | 'sell'
  price: number
}

export interface BacktestResult {
  totalReturn: number
  finalEquity: number
  cagr: number // % annualised
  winRate: number
  totalTrades: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  maxDrawdown: number
  buyHoldReturn: number
  buyHoldCagr: number // % annualised
  trades: Trade[]
  equity: { time: number; value: number }[]
  buyHoldEquity: { time: number; value: number }[]
  isInPosition: boolean
  signals: BacktestSignal[]
  windowStart: number // unix seconds
  windowEnd: number
  feeRate: number
  carriedEntry: boolean // window started already long (position carried in)
}

function emaMap(data: OHLCV[], period: number): Map<number, number> {
  const emaData = calcEMA(data, period)
  const m = new Map<number, number>()
  for (const d of emaData) m.set(d.time, d.value)
  return m
}

/**
 * Detect long entries/exits over the FULL candle history, so windowed
 * backtests never lose EMA warmup or the position state at window start.
 */
function detectSignals(data: OHLCV[], strategy: StrategyId): BacktestSignal[] {
  const ema21 = emaMap(data, 21)
  const ema55 = emaMap(data, 55)
  const ema200 = emaMap(data, 200)
  const signals: BacktestSignal[] = []
  let prevState: 'long' | null = null

  const pair = (fastM: Map<number, number>, slowM: Map<number, number>, t: number, tPrev: number) => {
    const fast = fastM.get(t), slow = slowM.get(t)
    const fastPrev = fastM.get(tPrev), slowPrev = slowM.get(tPrev)
    if (fast == null || slow == null || fastPrev == null || slowPrev == null) return null
    return {
      buy: fastPrev <= slowPrev && fast > slow,
      sell: fastPrev >= slowPrev && fast < slow,
    }
  }

  for (let i = 1; i < data.length; i++) {
    const t = data[i].time
    const tPrev = data[i - 1].time
    let buySignal = false
    let sellSignal = false

    if (strategy === 'ema21x55') {
      const x = pair(ema21, ema55, t, tPrev)
      if (!x) continue
      buySignal = x.buy
      sellSignal = x.sell
    } else if (strategy === 'ema21x200') {
      const x = pair(ema21, ema200, t, tPrev)
      if (!x) continue
      buySignal = x.buy
      sellSignal = x.sell
    } else if (strategy === 'ema55x200') {
      const x = pair(ema55, ema200, t, tPrev)
      if (!x) continue
      buySignal = x.buy
      sellSignal = x.sell
    } else if (strategy === 'tripleEma') {
      const e21 = ema21.get(t), e55 = ema55.get(t), e200 = ema200.get(t)
      const e21p = ema21.get(tPrev), e55p = ema55.get(tPrev), e200p = ema200.get(tPrev)
      if (e21 == null || e55 == null || e200 == null || e21p == null || e55p == null || e200p == null) continue
      const aligned = e21 > e55 && e55 > e200
      const alignedPrev = e21p > e55p && e55p > e200p
      const bearAligned = e21 < e55 && e55 < e200
      const bearAlignedPrev = e21p < e55p && e55p < e200p
      buySignal = !alignedPrev && aligned
      sellSignal = !bearAlignedPrev && bearAligned
    }

    if (buySignal && prevState !== 'long') {
      signals.push({ time: t, side: 'buy', price: data[i].close })
      prevState = 'long'
    } else if (sellSignal && prevState === 'long') {
      signals.push({ time: t, side: 'sell', price: data[i].close })
      prevState = null
    }
  }
  return signals
}

function runBacktest(
  data: OHLCV[],
  signals: BacktestSignal[],
  carriedEntry: boolean,
): BacktestResult {
  const STARTING_CAPITAL = 10_000
  let capital = STARTING_CAPITAL
  let position = 0
  let entryPrice = 0
  let entryTime = 0
  let entryCapital = 0
  const trades: Trade[] = []
  const equity: { time: number; value: number }[] = []

  let sigIdx = 0
  for (let i = 0; i < data.length; i++) {
    const t = data[i].time
    while (sigIdx < signals.length && signals[sigIdx].time === t) {
      const sig = signals[sigIdx]
      if (sig.side === 'buy' && position === 0) {
        entryCapital = capital
        position = (capital * (1 - FEE_RATE)) / sig.price
        entryPrice = sig.price
        entryTime = t
        capital = 0
      } else if (sig.side === 'sell' && position > 0) {
        const exitCapital = position * sig.price * (1 - FEE_RATE)
        trades.push({
          entryPrice,
          exitPrice: sig.price,
          entryTime,
          exitTime: t,
          pnl: ((exitCapital - entryCapital) / entryCapital) * 100,
          profit: exitCapital - entryCapital,
        })
        capital = exitCapital
        position = 0
      }
      sigIdx++
    }
    const currentEquity = position > 0 ? position * data[i].close : capital
    equity.push({ time: t, value: parseFloat(currentEquity.toFixed(2)) })
  }

  const finalEquity = position > 0 ? position * data[data.length - 1].close : capital
  const totalReturn = ((finalEquity - STARTING_CAPITAL) / STARTING_CAPITAL) * 100
  const wins = trades.filter((t) => t.pnl > 0)
  const losses = trades.filter((t) => t.pnl <= 0)
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
  const grossWins = wins.reduce((s, t) => s + t.profit, 0)
  const grossLosses = Math.abs(losses.reduce((s, t) => s + t.profit, 0))
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0

  let peak = STARTING_CAPITAL
  let maxDrawdown = 0
  for (const e of equity) {
    if (e.value > peak) peak = e.value
    const dd = ((peak - e.value) / peak) * 100
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  // Buy & hold over the SAME window, with the same one-time entry fee
  const firstClose = data[0].close
  const bhUnits = (STARTING_CAPITAL * (1 - FEE_RATE)) / firstClose
  const buyHoldEquity = data.map((c) => ({
    time: c.time,
    value: parseFloat((bhUnits * c.close).toFixed(2)),
  }))
  const bhFinal = bhUnits * data[data.length - 1].close
  const buyHoldReturn = ((bhFinal - STARTING_CAPITAL) / STARTING_CAPITAL) * 100

  const windowStart = data[0].time
  const windowEnd = data[data.length - 1].time
  const years = Math.max((windowEnd - windowStart) / (365.25 * 86400), 1 / 365)
  const annualise = (final: number) =>
    final > 0 ? (Math.pow(final / STARTING_CAPITAL, 1 / years) - 1) * 100 : -100

  return {
    totalReturn,
    finalEquity,
    cagr: annualise(finalEquity),
    winRate,
    totalTrades: trades.length,
    avgWin,
    avgLoss,
    profitFactor,
    maxDrawdown,
    buyHoldReturn,
    buyHoldCagr: annualise(bhFinal),
    trades,
    equity,
    buyHoldEquity,
    isInPosition: position > 0,
    signals,
    windowStart,
    windowEnd,
    feeRate: FEE_RATE,
    carriedEntry,
  }
}

export function useBacktest(
  candles: OHLCV[],
  strategy: StrategyId | null,
  period: BacktestPeriod = 'all',
): BacktestResult | null {
  return useMemo(() => {
    if (candles.length < 210 || !strategy) return null

    // Signals over the full history — windows keep correct EMA values
    const allSignals = detectSignals(candles, strategy)

    const days = PERIODS.find((p) => p.id === period)?.days ?? null
    const lastTime = candles[candles.length - 1].time
    const windowStartTime = days ? lastTime - days * 86400 : candles[0].time
    const window = candles.filter((c) => c.time >= windowStartTime)
    if (window.length < 2) return null

    // Position state at window start: if the strategy was long coming into
    // the window, enter at the first window close instead of pretending flat
    let inPos = false
    for (const s of allSignals) {
      if (s.time >= window[0].time) break
      inPos = s.side === 'buy'
    }
    const windowSignals = allSignals.filter((s) => s.time >= window[0].time)
    const carriedEntry = inPos
    const effectiveSignals = carriedEntry
      ? [{ time: window[0].time, side: 'buy' as const, price: window[0].close }, ...windowSignals]
      : windowSignals

    return runBacktest(window, effectiveSignals, carriedEntry)
  }, [candles, strategy, period])
}
