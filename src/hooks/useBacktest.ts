import { useMemo } from 'react'
import type { OHLCV } from '@/lib/types'
import { calcEMA } from '@/lib/calc/ema'

export type StrategyId = 'ema21x55' | 'ema21x200' | 'ema55x200' | 'tripleEma'

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

export interface Trade {
  entryPrice: number
  exitPrice: number
  entryTime: number
  exitTime: number
  pnl: number          // percentage
  profit: number       // dollar P&L (from $10k basis)
}

export interface BacktestSignal {
  time: number
  side: 'buy' | 'sell'
  price: number
}

export interface BacktestResult {
  totalReturn: number
  finalEquity: number
  winRate: number
  totalTrades: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  maxDrawdown: number
  buyHoldReturn: number
  trades: Trade[]
  equity: { time: number; value: number }[]
  isInPosition: boolean
  signals: BacktestSignal[]
}

function emaMap(data: OHLCV[], period: number): Map<number, number> {
  const emaData = calcEMA(data, period)
  const m = new Map<number, number>()
  for (const d of emaData) m.set(d.time, d.value)
  return m
}

function detectSignals(data: OHLCV[], strategy: StrategyId): BacktestSignal[] {
  const ema21 = emaMap(data, 21)
  const ema55 = emaMap(data, 55)
  const ema200 = emaMap(data, 200)
  const signals: BacktestSignal[] = []
  let prevState: 'long' | null = null

  for (let i = 1; i < data.length; i++) {
    const t = data[i].time
    const tPrev = data[i - 1].time
    let buySignal = false
    let sellSignal = false

    if (strategy === 'ema21x55') {
      const fast = ema21.get(t), slow = ema55.get(t)
      const fastPrev = ema21.get(tPrev), slowPrev = ema55.get(tPrev)
      if (fast == null || slow == null || fastPrev == null || slowPrev == null) continue
      if (fastPrev <= slowPrev && fast > slow) buySignal = true
      if (fastPrev >= slowPrev && fast < slow) sellSignal = true
    } else if (strategy === 'ema21x200') {
      const fast = ema21.get(t), slow = ema200.get(t)
      const fastPrev = ema21.get(tPrev), slowPrev = ema200.get(tPrev)
      if (fast == null || slow == null || fastPrev == null || slowPrev == null) continue
      if (fastPrev <= slowPrev && fast > slow) buySignal = true
      if (fastPrev >= slowPrev && fast < slow) sellSignal = true
    } else if (strategy === 'ema55x200') {
      const fast = ema55.get(t), slow = ema200.get(t)
      const fastPrev = ema55.get(tPrev), slowPrev = ema200.get(tPrev)
      if (fast == null || slow == null || fastPrev == null || slowPrev == null) continue
      if (fastPrev <= slowPrev && fast > slow) buySignal = true
      if (fastPrev >= slowPrev && fast < slow) sellSignal = true
    } else if (strategy === 'tripleEma') {
      const e21 = ema21.get(t), e55 = ema55.get(t), e200 = ema200.get(t)
      const e21p = ema21.get(tPrev), e55p = ema55.get(tPrev), e200p = ema200.get(tPrev)
      if (e21 == null || e55 == null || e200 == null || e21p == null || e55p == null || e200p == null) continue
      const aligned = e21 > e55 && e55 > e200
      const alignedPrev = e21p > e55p && e55p > e200p
      const bearAligned = e21 < e55 && e55 < e200
      const bearAlignedPrev = e21p < e55p && e55p < e200p
      if (!alignedPrev && aligned) buySignal = true
      if (!bearAlignedPrev && bearAligned) sellSignal = true
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

function runBacktest(data: OHLCV[], signals: BacktestSignal[]): BacktestResult {
  const STARTING_CAPITAL = 10_000
  let capital = STARTING_CAPITAL
  let position = 0
  let entryPrice = 0
  let entryTime = 0
  const trades: Trade[] = []
  const equity: { time: number; value: number }[] = [{ time: data[0].time, value: STARTING_CAPITAL }]

  let sigIdx = 0
  for (let i = 0; i < data.length; i++) {
    const t = data[i].time
    while (sigIdx < signals.length && signals[sigIdx].time === t) {
      const sig = signals[sigIdx]
      if (sig.side === 'buy' && position === 0) {
        position = capital / sig.price
        entryPrice = sig.price
        entryTime = t
        capital = 0
      } else if (sig.side === 'sell' && position > 0) {
        const exitCapital = position * sig.price
        const pnl = ((sig.price - entryPrice) / entryPrice) * 100
        trades.push({
          entryPrice,
          exitPrice: sig.price,
          entryTime,
          exitTime: t,
          pnl,
          profit: exitCapital - STARTING_CAPITAL * (exitCapital / (position * entryPrice)),
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
  const wins = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl <= 0)
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
  const profitFactor =
    avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : avgWin > 0 ? Infinity : 0

  let peak = STARTING_CAPITAL
  let maxDrawdown = 0
  for (const e of equity) {
    if (e.value > peak) peak = e.value
    const dd = ((peak - e.value) / peak) * 100
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  const buyHoldReturn = data.length > 1
    ? ((data[data.length - 1].close - data[0].close) / data[0].close) * 100
    : 0

  return {
    totalReturn,
    finalEquity,
    winRate,
    totalTrades: trades.length,
    avgWin,
    avgLoss,
    profitFactor,
    maxDrawdown,
    buyHoldReturn,
    trades,
    equity,
    isInPosition: position > 0,
    signals,
  }
}

export function useBacktest(
  candles: OHLCV[],
  activeStrategies: Set<StrategyId>
): BacktestResult | null {
  return useMemo(() => {
    if (candles.length < 210 || activeStrategies.size === 0) return null

    // Gather signals from all active strategies
    let allSignals: BacktestSignal[] = []
    for (const strat of activeStrategies) {
      allSignals.push(...detectSignals(candles, strat))
    }

    // Sort by time, deduplicate same-time same-side
    allSignals.sort((a, b) => a.time - b.time || (a.side === 'buy' ? -1 : 1))
    const seen = new Set<string>()
    allSignals = allSignals.filter(s => {
      const key = `${s.time}-${s.side}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Merge conflicting buy/sell pairs respecting position state
    const merged: BacktestSignal[] = []
    let inPos = false
    for (const s of allSignals) {
      if (s.side === 'buy' && !inPos) { merged.push(s); inPos = true }
      else if (s.side === 'sell' && inPos) { merged.push(s); inPos = false }
    }

    return runBacktest(candles, merged)
  }, [candles, activeStrategies])
}
