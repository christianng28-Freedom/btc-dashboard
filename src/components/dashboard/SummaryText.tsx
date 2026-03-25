'use client'

interface Props {
  score: number | null  // 0–100 overall score
}

interface Interpretation {
  range: [number, number]
  headline: string
  body: string
  color: string
}

const INTERPRETATIONS: Interpretation[] = [
  {
    range: [0, 20],
    headline: 'Strong Buy Signal',
    body: 'Multiple indicators are aligned in a historically bullish configuration. Fear dominates market sentiment, open interest is compressed, and technicals show oversold conditions. Historically, this confluence has preceded significant price appreciation.',
    color: '#22c55e',
  },
  {
    range: [20, 40],
    headline: 'Cautious Buy',
    body: 'The weight of evidence tilts bullish. Sentiment is below average, leverage is modest, and technical structure is constructive. Accumulation may be appropriate, though confirmation from additional signals is advised.',
    color: '#86efac',
  },
  {
    range: [40, 60],
    headline: 'Neutral — No Clear Edge',
    body: 'Indicators are mixed, with no strong directional consensus. Sentiment is moderate, leverage is near historical averages, and technicals lack a clear trend signal. Positioning cautiously and waiting for clarity is a prudent approach.',
    color: '#f59e0b',
  },
  {
    range: [60, 80],
    headline: 'Elevated Risk — Consider Reducing Exposure',
    body: 'The composite score reflects increasing risk. Greed is elevated, open interest is above its 90-day average, and technical indicators are in overbought territory. Historically, such conditions precede periods of volatility or correction.',
    color: '#f87171',
  },
  {
    range: [80, 100],
    headline: 'Strong Sell Signal — Extreme Caution',
    body: 'Indicators are aligned in a historically bearish configuration. Extreme greed pervades sentiment, futures leverage is at dangerous levels, and technicals are severely overbought. This environment has historically preceded major tops.',
    color: '#ef4444',
  },
]

function getInterpretation(score: number): Interpretation {
  return (
    INTERPRETATIONS.find(
      (i) => score >= i.range[0] && score < i.range[1]
    ) ?? INTERPRETATIONS[INTERPRETATIONS.length - 1]
  )
}

export function SummaryText({ score }: Props) {
  if (score === null) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5">
        <div className="text-[#555] text-sm font-mono">Calculating conviction score…</div>
      </div>
    )
  }

  const interp = getInterpretation(score)

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-5 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: interp.color }} />
        <div>
          <div className="text-[10px] font-mono text-[#666] uppercase tracking-widest">Signal Summary</div>
          <div className="text-sm font-bold font-mono" style={{ color: interp.color }}>
            {interp.headline}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold font-mono" style={{ color: interp.color }}>
            {Math.round(score)}
          </div>
          <div className="text-[10px] text-[#555] font-mono">/ 100</div>
        </div>
      </div>
      <p className="text-[#999] text-xs leading-relaxed font-mono">{interp.body}</p>
    </div>
  )
}
