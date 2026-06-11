# BTC Command — Critical Review (Foundation Audit for the AI Hedge Fund)

> **Status update (same session):** F1–F4 (all P0s) and F8 are fixed and verified
> live; F9 is fixed via the Fund Desk synthesis in the briefing route. The
> `/api/market-state` endpoint ("The One Thing") is built, plus the agent
> framework on top of it. Still open: F5 (freshness indicators in the UI),
> F6 (score attribution UI), F7 (stale normalization bounds), F10 (score
> backtest).

*Reviewed 2026-06-11. Method: full read of the scoring engine, alert/notification layer, data hooks, and API routes, plus live inspection of the running app at desktop and 390px widths. Every finding cites a real file or a behavior reproduced live.*

---

## 1. Scorecard

| Dimension | Score | Why | What a 10 looks like |
|---|---|---|---|
| Decision-usefulness | 4/10 | Gauges + Buy/Sell labels + summary text exist, but "what changed", "why", and "what would change my mind" are unanswerable anywhere in the UI | One screen that answers exposure / change / confidence / risk in 60 seconds |
| Signal integrity | 3/10 | Pi Cycle double-counted; the same fundamental score computes to different values on different screens; scores change when you switch chart timeframe; weights unvalidated | One canonical score, computed once, components non-overlapping, weights sanity-checked against past cycles |
| Data trust | 2/10 | Missing data renders as "all signals nominal" and as fake-neutral score inputs; zero freshness indicators; failed fetches are completely silent (verified live: 3 of 4 gauges stuck on "Loading…" with empty console) | Every metric timestamped, every failure visible, missing inputs excluded and disclosed |
| UX / information architecture | 5/10 | Clean dark aesthetic, no mobile overflow at 390px, collapsible nav rail. But news feed sits above conviction signals, "V2" doubles as a loading state, and the overall conviction gauge is the 4th item in the grid | Decision hero at top, evidence below, raw data behind a click; loading ≠ error ≠ disabled |
| Actionability | 3/10 | Kelly calculator and conviction score are disconnected islands; no position journal; alerts state facts ("RSI is 80") not actions | Score → allocation band → "you are overweight vs. model" → what invalidates the call |
| Agent-readiness | 3/10 | `src/lib/calc/` is pure (good seed), briefing route proves the LLM pipeline. But all score composition lives in client React hooks, there is no machine-readable market-state endpoint, and no persistence (Vercel fs is read-only; brief cache is `/tmp`) | A versioned `/api/market-state` JSON any agent can consume + durable report storage |

---

## 2. Top 10 Findings

### P0 — could cause a bad investment decision

**F1. Scores and alerts are coupled to the chart's display interval.**
[page.tsx:45](src/app/bitcoin/page.tsx) feeds `useCandles(chartInterval, 500)` into both `useTechnicalIndicators` (line 55) and the alert inputs (lines 71–107). Reproduced live: on 1D the dashboard showed **Technical 18 (Buy)** and **3 active alerts (RSI Extremely Oversold — CRITICAL)**; clicking the 1H chart tab flipped Key Alerts to **"All signals nominal — no active alerts"**. A display toggle silently rewrites the risk picture.
*Fix: compute scores/alerts from a dedicated daily-candle fetch (`useCandles('1d', 500)`), independent of the chart's interval state.*

**F2. Missing data renders as "all clear" or as fake-neutral inputs.**
- [KeyAlerts](src/components/dashboard/KeyAlerts.tsx) shows "All signals nominal" when alert inputs are simply absent — unknown is displayed as safe.
- [page.tsx:61-63](src/app/bitcoin/page.tsx) passes `fundData?.currentOI ?? 0`, `?? 0` funding, `dominance ?? 50`: with OI 0/0 the OI component scores 32 (a *buy* lean) purely from missing data.
- Verified live: three gauges stuck at "Loading…" indefinitely, zero console errors, no UI error state.
*Fix: don't compute the fundamental score until `fundData` exists (the fundamental tab already does this); give KeyAlerts an explicit "data unavailable" state; add error states to gauges.*

**F3. The fundamental score is a different number on different screens.**
[fundamental/page.tsx:37-48](src/app/bitcoin/fundamental/page.tsx) passes all 6 macro inputs (Fed funds, CPI, PCE, M2, 10Y, DXY) into `calcFundamentalScore`. The home page ([page.tsx:57-65](src/app/bitcoin/page.tsx)) and the notification engine ([useConvictionScore.ts:30-38](src/hooks/useConvictionScore.ts)) pass none — so 53% of the fundamental weight is permanently pinned at neutral 50 there, and the headline conviction score and its notifications are computed from a different fundamental score than the fundamental tab displays.
*Fix: wire `useMacroData()` into both callers (short term); single server-side computation (the `/api/market-state` endpoint) as the structural fix.*

**F4. Pi Cycle is double-counted across pillars.**
[technical-scores.ts:274-283](src/lib/calc/technical-scores.ts) (15%) and [onchain-scores.ts:85-93](src/lib/calc/onchain-scores.ts) (10%). Through the 30/40 composite weights that's ~8.5% of the overall score from one indicator via two doors — and it's also correlated with Mayer Multiple, 200w ratio, and price-vs-ATH, all in the on-chain pillar. A Pi Cycle squeeze would move the composite far more than any single stated weight suggests.
*Fix: remove Pi Cycle from the on-chain pillar (it is an MA-cross technical indicator, not on-chain data) and renormalize the on-chain weights.*

### P1 — erodes trust and usability

**F5. Zero freshness indicators.** Live DOM scan found no "updated / as of" element anywhere. `fundData.lastUpdated` already exists ([useFundamentalData.ts:69](src/hooks/useFundamentalData.ts)) but is never rendered. Macro data can be 6h stale (cache) on a Fed day. *Fix: timestamp every card; stale styling past a per-metric threshold.*

**F6. No "why did it move" attribution.** All component scores are returned by the calc functions but the UI shows only the total. A 65→48 move is unexplainable, so the score will be distrusted exactly when it matters. *Fix: ranked component-delta panel under the overall gauge; requires storing daily score snapshots (lands with Phase 1 KV).*

**F7. Stale normalization bounds.** [fundamental-scores.ts](src/lib/calc/fundamental-scores.ts): DXY uses `minMax(dxy, 95, 125)` but the value fed is FRED's **broad** index (DTWEXBGS, [macro/route.ts:34](src/app/api/macro/route.ts)), which has sat above 110 since 2022 → near-permanent sell reading once wired in. Fed funds `minMax(0, 5.5)`, CPI `(1.5, 6)`, MVRV `(0.8, 3.5)` similarly pin at regime extremes. *Fix: percentile-vs-history normalization (already implemented as `percentileRank` for Mayer Multiple — reuse it) or documented bounds with a "pinned" warning.*

**F8. Information hierarchy is inverted.** On both desktop and mobile, the BTC news feed renders above Conviction Signals ([page.tsx:132-148](src/app/bitcoin/page.tsx)); at 390px the first screen is a clickbait headline ("3 Altcoins To Watch") before any signal, and the Overall gauge is the last of 4 in the grid. *Fix: order = Overall conviction hero → alerts → summary → chart → news; put Overall first in the gauge grid.*

**F9. The morning brief ignores the dashboard.** [briefing/route.ts:68-123](src/app/api/briefing/route.ts) is a pure Gemini web-search prompt — it never sees the conviction score, funding, OI, alerts, or any number the dashboard computed. The user's most-read artifact is disconnected from their own signal engine. *Fix: Phase 5 — brief synthesizes the agents' reports and the market-state snapshot.*

**F10. Score weights are unvalidated and the backtest doesn't test them.** The 40/30/30 blend and all component weights are hand-picked; the BacktestPanel backtests other strategies, not the conviction score itself. *Fix: replay the score over 2017/2021/2024 daily history and publish its hit rate at Buy ≤25 / Sell ≥75 thresholds — the single highest-trust feature shippable.*

---

## 3. The One Thing

**Build `/api/market-state` — one server-side endpoint that computes the canonical scores, components, alerts, and per-source freshness.** It structurally eliminates F1/F2/F3 (one computation, pinned inputs, explicit nulls), is the prerequisite for attribution (F6) and score history, and is the substrate every hedge-fund agent consumes. Everything else in the AI-hedge-fund plan stacks on it.

## 4. Quick Wins (<1 hour each)

1. Reorder the home page: conviction signals above the news feed ([page.tsx](src/app/bitcoin/page.tsx)).
2. Rename the `PlaceholderGauge` "V2" text — loading, error, and "not available" are three different states ([SignalSummaryPanel.tsx:15-25](src/components/dashboard/SignalSummaryPanel.tsx)).
3. Delete the dead, opposite-convention helpers `normalizeRSI` / `normalizeStochRSI` / `normalizeMACD` in [normalization.ts](src/lib/calc/normalization.ts) — they invert the score convention and are a landmine for agent code reuse.
4. Render `fundData.lastUpdated` on the funding/OI cards.
5. Fix the `http://localhost` reference in [instrumentation.ts](src/instrumentation.ts) to a relative/env-based URL.
6. KeyAlerts: render "Signal data unavailable" instead of "All signals nominal" when inputs are empty.
7. Funding-rate component scores 59 (mild sell) at the 0.01% baseline funding rate — center `sigmoid` at the baseline, not zero ([fundamental-scores.ts:74](src/lib/calc/fundamental-scores.ts)).
