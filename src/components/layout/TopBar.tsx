'use client'
import { usePrice } from '@/hooks/usePrice'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useIndices } from '@/hooks/useIndices'
import { formatPrice, formatChange } from '@/lib/format'

function formatIndex(n: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function BitcoinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#f7931a" fillOpacity="0.12" />
      <path
        fill="#f7931a"
        d="M20.8 13.9c.3-1.8-1.1-2.8-3-3.4l.6-2.5-1.5-.4-.6 2.4c-.4-.1-.8-.2-1.2-.3l.6-2.4-1.5-.4-.6 2.5c-.3-.1-.7-.2-1-.2v0l-2.1-.5-.4 1.6s1.1.25 1.1.25c.6.15.7.55.68.82l-.7 2.9.15.05-.15-.04-1 3.9c-.07.17-.25.44-.65.34.01.02-1.1-.27-1.1-.27l-.72 1.7 1.87.47c.35.09.7.18 1.04.27l-.6 2.5 1.5.38.6-2.5c.4.11.79.21 1.28.3l-.6 2.48 1.5.38.6-2.5c2.44.46 4.28.28 5.05-1.94.62-1.78-.03-2.8-1.32-3.47.94-.22 1.65-.85 1.84-2.14zm-3.4 4.8c-.44 1.78-3.43.82-4.4.57l.79-3.14c.97.25 4.07.73 3.61 2.57zm.44-4.66c-.4 1.62-2.92.79-3.74.59l.71-2.85c.82.2 3.47.58 3.03 2.26z"
      />
    </svg>
  )
}

function SolanaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="sol-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#sol-grad)" fillOpacity="0.12" />
      <path d="M9 10.5 L21 10.5 L23 13 L11 13 Z" fill="url(#sol-grad)" />
      <path d="M9 15 L21 15 L23 17.5 L11 17.5 Z" fill="url(#sol-grad)" />
      <path d="M9 19.5 L21 19.5 L23 22 L11 22 Z" fill="url(#sol-grad)" />
    </svg>
  )
}

function GoldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#f5c842" fillOpacity="0.12" />
      <path d="M10 14 L16 11 L22 14 L16 17 Z" fill="#f5c842" fillOpacity="0.6" />
      <path d="M10 14 L10 20 L16 23 L16 17 Z" fill="#f5c842" fillOpacity="0.85" />
      <path d="M16 17 L16 23 L22 20 L22 14 Z" fill="#f5c842" />
    </svg>
  )
}

function GlowDot({ isPositive, loading }: { isPositive: boolean; loading?: boolean }) {
  if (loading) return null
  return (
    <span
      className="w-[5px] h-[5px] rounded-full flex-shrink-0"
      style={{
        background: isPositive ? '#22c55e' : '#ef4444',
        animation: isPositive
          ? 'glow-pulse-green 2s ease-in-out infinite'
          : 'glow-pulse-red 2s ease-in-out infinite',
      }}
    />
  )
}

function TickerCard({
  label,
  icon,
  price,
  change,
  isPositive,
  loading,
}: {
  label: string
  icon?: React.ReactNode
  price: string
  change: string
  isPositive: boolean
  loading?: boolean
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:border-white/[0.10] hover:bg-white/[0.04]"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {icon}
      <div className="flex flex-col gap-[3px]">
        <span className="text-[9px] font-semibold text-white/25 uppercase tracking-[0.14em] leading-none">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-mono text-[13px] font-semibold tabular-nums leading-none transition-colors ${
              loading ? 'text-white/15' : 'text-[#e2e8f0]'
            }`}
          >
            {loading ? '——' : price}
          </span>
          {!loading && change && (
            <span
              className={`text-[11px] font-semibold tabular-nums leading-none ${
                isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
              }`}
            >
              {change}
            </span>
          )}
          <GlowDot isPositive={isPositive} loading={loading} />
        </div>
      </div>
    </div>
  )
}

export function TopBar() {
  const { price, changePercent, isLoading } = usePrice()
  const { connectionStatus } = useWebSocket()
  const { data: indices, isLoading: indicesLoading } = useIndices()

  const btcPositive = changePercent >= 0
  const btcPrice = isLoading || price === 0 ? '' : formatPrice(price)
  const btcChange = isLoading || price === 0 ? '' : formatChange(changePercent)

  const solPositive = (indices?.sol.changePercent ?? 0) >= 0
  const solPrice = indices ? `$${formatIndex(indices.sol.price)}` : ''
  const solChange = indices ? formatChange(indices.sol.changePercent) : ''

  const goldPositive = (indices?.gold.changePercent ?? 0) >= 0
  const goldPrice = indices ? formatIndex(indices.gold.price) : ''
  const goldChange = indices ? formatChange(indices.gold.changePercent) : ''

  const spxPositive = (indices?.spx.changePercent ?? 0) >= 0
  const spxPrice = indices ? formatIndex(indices.spx.price) : ''
  const spxChange = indices ? formatChange(indices.spx.changePercent) : ''

  const ndxPositive = (indices?.ndx.changePercent ?? 0) >= 0
  const ndxPrice = indices ? formatIndex(indices.ndx.price) : ''
  const ndxChange = indices ? formatChange(indices.ndx.changePercent) : ''

  return (
    <header className="relative h-14 flex-shrink-0 bg-[#05070A] flex items-center px-4 gap-3">
      {/* Gradient accent along bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00A3FF]/30 to-transparent" />

      {/* Brand mark */}
      <div className="flex items-center gap-3 mr-3">
        <div className="flex flex-col gap-[3px]">
          <div
            className="w-[3px] h-3.5 rounded-full bg-[#00A3FF]"
            style={{ boxShadow: '0 0 6px rgba(0,163,255,0.8)' }}
          />
          <div className="w-[3px] h-2 rounded-full bg-[#00A3FF]/35" />
        </div>
        <div className="flex flex-col gap-0">
          <span className="text-white font-black text-[13px] tracking-tight uppercase leading-none">COMMAND</span>
          <span className="text-[#00A3FF]/60 text-[8px] tracking-[0.28em] uppercase leading-none">Centre</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Market ticker cards */}
      <div className="flex items-center gap-2">
        <TickerCard
          label="Bitcoin"
          icon={<BitcoinIcon />}
          price={btcPrice}
          change={btcChange}
          isPositive={btcPositive}
          loading={isLoading || price === 0}
        />

        <TickerCard
          label="Solana"
          icon={<SolanaIcon />}
          price={solPrice}
          change={solChange}
          isPositive={solPositive}
          loading={indicesLoading || !indices}
        />

        <TickerCard
          label="Gold"
          icon={<GoldIcon />}
          price={goldPrice ? `$${goldPrice}` : ''}
          change={goldChange}
          isPositive={goldPositive}
          loading={indicesLoading || !indices}
        />

        <TickerCard
          label="S&P 500"
          price={spxPrice}
          change={spxChange}
          isPositive={spxPositive}
          loading={indicesLoading || !indices}
        />

        <TickerCard
          label="NASDAQ 100"
          price={ndxPrice}
          change={ndxChange}
          isPositive={ndxPositive}
          loading={indicesLoading || !indices}
        />
      </div>

      {/* Subtle divider */}
      <div className="w-px h-7 bg-white/[0.06] flex-shrink-0 mx-1" />

      {/* Connection status */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex h-2 w-2">
          <span
            className={`absolute inset-0 rounded-full ${
              connectionStatus === 'live'
                ? 'bg-[#22c55e]'
                : connectionStatus === 'connecting'
                ? 'bg-[#f59e0b]'
                : 'bg-[#444460]'
            }`}
          />
          {connectionStatus === 'live' && (
            <span className="absolute inset-0 animate-ping rounded-full bg-[#22c55e] opacity-50" />
          )}
        </div>
        <span className="hidden sm:block text-[10px] font-medium text-white/25 uppercase tracking-[0.14em]">
          {connectionStatus}
        </span>
      </div>
    </header>
  )
}
