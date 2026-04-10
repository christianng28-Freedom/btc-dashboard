'use client'

import type { KellyFraction } from '@/lib/calc/kelly'
import type { RiskProfile } from './KellyInputPanel'

interface Props {
  riskProfile: RiskProfile
  fractions: KellyFraction[]
  fullKelly: number
}

const PROFILE_LABELS: Record<RiskProfile, string> = {
  conservative: 'Eighth Kelly (12.5%)',
  moderate: 'Half Kelly (50%)',
  aggressive: 'Full Kelly (100%)',
}

const PROFILE_INDEX: Record<RiskProfile, number> = {
  conservative: 3,
  moderate: 1,
  aggressive: 0,
}

export function KellyGuidance({ riskProfile, fractions, fullKelly }: Props) {
  const recommended = fractions[PROFILE_INDEX[riskProfile]]
  const isLeverage = fullKelly > 1

  return (
    <div className="bg-[#0d1018] border border-[#1a1a2e] rounded-xl p-5 space-y-5">
      <h3 className="text-[#e0e0e0] text-sm font-semibold">Recommendation & Guidance</h3>

      {/* Primary Recommendation */}
      <div className="bg-[#3b82f6]/[0.06] border border-[#3b82f6]/20 rounded-lg p-4">
        <p className="text-[#3b82f6] text-sm font-semibold mb-1">
          Based on your {riskProfile} risk profile, consider {PROFILE_LABELS[riskProfile]}
        </p>
        <p className="text-[#999] text-sm">
          This means allocating <span className="text-white font-mono font-semibold">{(recommended.allocation * 100).toFixed(1)}%</span> of
          your portfolio (${recommended.dollarAmount >= 1000 ? `${(recommended.dollarAmount / 1000).toFixed(1)}k` : recommended.dollarAmount.toFixed(0)}) to Bitcoin,
          with an expected growth rate of <span className="text-[#22c55e] font-mono">{(recommended.expectedGrowthRate * 100).toFixed(1)}%</span> per year.
        </p>
      </div>

      {/* Leverage Warning */}
      {isLeverage && (
        <div className="bg-[#ef4444]/[0.06] border border-[#ef4444]/20 rounded-lg p-4">
          <p className="text-[#ef4444] text-sm font-semibold mb-1">
            Leverage Warning
          </p>
          <p className="text-[#999] text-sm">
            The full Kelly fraction ({(fullKelly * 100).toFixed(0)}%) exceeds 100%, implying leveraged exposure.
            Leveraged positions amplify losses and can lead to liquidation. In practice, borrowing costs,
            margin calls, and black-swan events make leveraged Kelly extremely dangerous.
            Never use leverage unless you fully understand and accept the risk of total loss.
          </p>
        </div>
      )}

      {/* Key Insights */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="w-1 bg-[#f59e0b]/40 rounded-full flex-shrink-0" />
          <div>
            <p className="text-[#e0e0e0] text-sm font-medium">Why full Kelly is almost never recommended for Bitcoin</p>
            <p className="text-[#999] text-xs mt-1 leading-relaxed">
              The Kelly Criterion assumes you know the true expected return and volatility with certainty.
              In reality, BTC return estimates are highly uncertain, and BTC exhibits fat tails (extreme moves
              beyond what a normal distribution predicts). Estimation error alone can turn an &quot;optimal&quot;
              allocation into a path to ruin. Academic research consistently shows that half-Kelly or less
              delivers ~75% of the growth rate with dramatically less variance and drawdown risk.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-1 bg-[#3b82f6]/40 rounded-full flex-shrink-0" />
          <div>
            <p className="text-[#e0e0e0] text-sm font-medium">Practical rules of thumb</p>
            <ul className="text-[#999] text-xs mt-1 space-y-1 leading-relaxed">
              <li>&bull; Most practitioners use half-Kelly or quarter-Kelly as their upper bound.</li>
              <li>&bull; Never allocate more than 50% of net worth to a single volatile asset, regardless of what the formula says.</li>
              <li>&bull; If your calculated f* is negative, the expected return doesn&apos;t justify the risk — consider zero allocation.</li>
              <li>&bull; Re-run this analysis quarterly as your return/volatility assumptions change.</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-1 bg-[#22c55e]/40 rounded-full flex-shrink-0" />
          <div>
            <p className="text-[#e0e0e0] text-sm font-medium">Rebalancing</p>
            <p className="text-[#999] text-xs mt-1 leading-relaxed">
              Kelly is a continuous-time formula that assumes constant rebalancing. In practice, rebalance
              monthly or quarterly to stay near your target allocation. More frequent rebalancing incurs
              transaction costs; less frequent rebalancing increases drift from the optimal fraction.
              A good rule: rebalance when your actual allocation drifts more than 5% from target.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-1 bg-[#a78bfa]/40 rounded-full flex-shrink-0" />
          <div>
            <p className="text-[#e0e0e0] text-sm font-medium">Further reading</p>
            <p className="text-[#999] text-xs mt-1 leading-relaxed">
              &bull; &quot;Fortune&apos;s Formula&quot; by William Poundstone — the definitive popular account of Kelly&apos;s work.<br />
              &bull; Fred Krueger&apos;s Bitcoin Kelly analysis threads on X/Twitter.<br />
              &bull; Ed Thorp&apos;s &quot;The Kelly Criterion in Blackjack, Sports Betting, and the Stock Market&quot; (2006 paper).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
