import { computeMarketState } from '@/lib/server/market-state'
import { fetchYahooFinanceQuote } from '@/lib/api/yahoo-finance'
import { getStore, type AgentReport } from '@/lib/server/store'
import type { AgentDefinition } from './runner'

/**
 * Momentum Analyst — runs at US open / midday / close.
 * Reads the canonical market state plus the AI/semi equity watchlist and
 * issues an add / hold / trim / hedge bias with explicit invalidation levels.
 */

export type ActionBias = 'add' | 'hold' | 'trim' | 'hedge'

export interface MomentumStructured extends Record<string, unknown> {
  session: string // e.g. 'us-open' | 'us-midday' | 'us-close'
  action_bias: ActionBias
  confidence: number // 0–100
  momentum_read: string // one-line BTC summary
  equity_read: string // one-line AI/semi watchlist summary
  key_moves: string[]
  invalidation_levels: string[]
}

const DEFAULT_WATCHLIST = ['NVDA', 'AMD', 'TSM', 'AVGO', 'MU']
const WATCHLIST_KEY = 'watchlist:equities'

export async function getWatchlist(): Promise<string[]> {
  const list = await getStore().get<string[]>(WATCHLIST_KEY)
  return list && list.length > 0 ? list : DEFAULT_WATCHLIST
}

export function currentSession(): string {
  // Sessions anchored to US equity hours; runs are scheduled in UTC crons
  const utcHour = new Date().getUTCHours()
  if (utcHour >= 12 && utcHour < 16) return 'us-open' // 13:30 UTC = 9:30 ET
  if (utcHour >= 16 && utcHour < 20) return 'us-midday'
  return 'us-close'
}

function fmtPct(v: number | null | undefined): string {
  return v == null ? 'n/a' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

export const momentumAgent: AgentDefinition<MomentumStructured> = {
  name: 'momentum',
  title: 'Momentum Analyst',
  persona: `You are the Momentum Analyst of a one-person hedge fund focused on Bitcoin
and AI/semiconductor equities. You report at US market open, midday, and close.

Your job for this session — the fund holds BTC AND AI/semi equities, so cover
both, not just Bitcoin:
1. Read the momentum picture for BTC (conviction scores, RSI, funding, alerts)
   AND for the equity watchlist (daily moves, notable outliers).
2. Compare against your PREVIOUS REPORT (if provided) and lead with what
   CHANGED — a reader who saw your last report should learn something new.
3. Issue exactly one action bias for the BTC position: add | hold | trim | hedge.
   Bias changes need justification anchored in the data provided.
4. State 1-3 concrete invalidation levels (price/indicator thresholds that
   would flip your read).
5. The markdown report must have a "## Bitcoin" section and an "## Equities"
   section — give the watchlist genuine analysis (leaders, laggards, what it
   implies for the AI/semi complex), not a one-line afterthought.

Rules: reason ONLY from the data provided in the live context. If a data
source is marked failed/unavailable, say so and lower your confidence — never
guess values. Conviction score scale: 0 = strong buy, 100 = strong sell.

Structured fields required: "session" (string), "action_bias" ("add"|"hold"|"trim"|"hedge"),
"confidence" (0-100 number), "momentum_read" (one sentence on BTC),
"equity_read" (one sentence on the equity watchlist), "key_moves"
(array of strings covering both BTC and equities), "invalidation_levels"
(array of strings).`,

  async gatherContext(previous: AgentReport<MomentumStructured> | null): Promise<string> {
    const [state, watchlist] = await Promise.all([computeMarketState(), getWatchlist()])

    const quotes = await Promise.all(
      watchlist.map(async (t) => {
        try {
          const q = await fetchYahooFinanceQuote(t)
          return `${t}: $${q.price.toFixed(2)} (${fmtPct(q.changePercent)})`
        } catch {
          return `${t}: quote unavailable`
        }
      }),
    )

    const s = state.scores
    const failedSources = Object.entries(state.sources)
      .filter(([, st]) => !st.ok)
      .map(([name, st]) => `${name} (${st.error ?? 'no data'})`)

    const lines = [
      `Session: ${currentSession()} | Generated: ${state.generatedAt}`,
      `BTC price: ${state.price != null ? `$${state.price.toLocaleString()}` : 'UNAVAILABLE'}`,
      '',
      '— Conviction scores (0=strong buy … 100=strong sell) —',
      `Overall: ${s.overall ? `${s.overall.totalScore.toFixed(0)} (${s.overall.label})` : 'unavailable'}`,
      `Technical: ${s.technical ? `${s.technical.totalScore.toFixed(0)} (${s.technical.label})` : 'unavailable'}`,
      `Fundamental: ${s.fundamental ? `${s.fundamental.totalScore.toFixed(0)} (${s.fundamental.label})` : 'unavailable'}`,
      `On-chain: ${s.onChain ? `${s.onChain.totalScore.toFixed(0)} (${s.onChain.label})` : 'unavailable'}`,
      '',
      '— Raw indicators —',
      `RSI(14, daily): ${state.raw.rsi?.toFixed(1) ?? 'n/a'}`,
      `Funding rate: ${state.raw.fundingRate != null ? (state.raw.fundingRate * 100).toFixed(4) + '%' : 'n/a'} (annualised ${state.raw.annualisedFundingRatePct?.toFixed(1) ?? 'n/a'}%)`,
      `OI vs 90d MA: ${fmtPct(state.raw.oiDeviationPct)}`,
      `Fear & Greed: ${state.raw.fearGreed ?? 'n/a'} (${state.raw.fearGreedLabel ?? 'n/a'})`,
      `Pi Cycle gap: ${state.raw.piCycleGapPct?.toFixed(1) ?? 'n/a'}%`,
      `NUPL: ${state.raw.nupl?.toFixed(3) ?? 'n/a'} | MVRV: ${state.raw.mvrv?.toFixed(2) ?? 'n/a'}`,
      `BTC dominance: ${state.raw.dominancePct?.toFixed(1) ?? 'n/a'}%`,
      '',
      '— Active alerts —',
      state.alerts.length > 0
        ? state.alerts.map((a) => `[${a.priority.toUpperCase()}] ${a.title}: ${a.detail}`).join('\n')
        : '(none)',
      '',
      '— AI/semi equity watchlist —',
      quotes.join('\n'),
      '',
      failedSources.length > 0
        ? `— DATA SOURCES FAILED THIS RUN: ${failedSources.join(', ')} —`
        : '— All data sources healthy —',
    ]

    if (previous) {
      lines.push(
        '',
        `— YOUR PREVIOUS REPORT (${previous.generatedAt}) —`,
        `Previous bias: ${previous.structured.action_bias} (confidence ${previous.structured.confidence})`,
        `Previous read: ${previous.structured.momentum_read}`,
      )
    } else {
      lines.push('', '— No previous report — this is your first session —')
    }

    return lines.join('\n')
  },

  validate(structured: MomentumStructured): void {
    const biases: ActionBias[] = ['add', 'hold', 'trim', 'hedge']
    if (!biases.includes(structured.action_bias)) {
      throw new Error(`Invalid action_bias: ${String(structured.action_bias)}`)
    }
    if (typeof structured.confidence !== 'number' || structured.confidence < 0 || structured.confidence > 100) {
      throw new Error('confidence must be a number 0-100')
    }
    if (!structured.momentum_read || typeof structured.momentum_read !== 'string') {
      throw new Error('momentum_read is required')
    }
    // equity_read is expected but tolerated if a model omits it — the run is
    // still useful for the BTC bias
    if (structured.equity_read != null && typeof structured.equity_read !== 'string') {
      throw new Error('equity_read must be a string when present')
    }
  },

  gemini: { temperature: 0.2, maxOutputTokens: 8192 },
}
