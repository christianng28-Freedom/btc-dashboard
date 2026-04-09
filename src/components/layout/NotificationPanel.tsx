'use client'
import { useNotifications } from '@/providers/NotificationProvider'
import type { NotificationCategory } from '@/lib/notifications'
import { isNotificationSupported } from '@/lib/notifications'

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="relative flex-shrink-0 w-10 h-[22px] rounded-full focus:outline-none cursor-pointer transition-colors duration-200"
      style={{
        background: enabled ? '#00A3FF' : 'rgba(255,255,255,0.12)',
        border: `1.5px solid ${enabled ? 'rgba(0,163,255,0.6)' : 'rgba(255,255,255,0.15)'}`,
      }}
    >
      {/* Thumb */}
      <span
        className={`absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full transition-transform duration-200`}
        style={{
          transform: enabled ? 'translateX(18px)' : 'translateX(0px)',
          background: enabled ? '#fff' : 'rgba(255,255,255,0.45)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          transitionTimingFunction: 'cubic-bezier(0.34,1.2,0.64,1)',
        }}
      />
    </button>
  )
}

const CATEGORY_META: { id: NotificationCategory; label: string; icon: string }[] = [
  { id: 'price', label: 'Price Alerts', icon: '₿' },
  { id: 'sentiment', label: 'Sentiment Extremes', icon: '📊' },
  { id: 'conviction', label: 'Conviction Score', icon: '🎯' },
  { id: 'funding', label: 'Funding Rate', icon: '⚡' },
  { id: 'economic', label: 'Economic Calendar', icon: '📅' },
]

interface NotificationPanelProps {
  onClose: () => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationPanel({ onClose: _onClose }: NotificationPanelProps) {
  const { settings, updateSettings, updateCategory, requestPermission, permissionStatus, recentNotifications } =
    useNotifications()

  const supported = isNotificationSupported()

  return (
    <div
      className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border text-sm overflow-hidden"
      style={{
        background: 'rgba(8,11,16,0.97)',
        borderColor: 'rgba(255,255,255,0.07)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Unsupported browser */}
      {!supported && (
        <div className="px-4 py-3 text-white/40 text-xs text-center">
          Notifications not supported in this browser
        </div>
      )}

      {/* Permission denied */}
      {supported && permissionStatus === 'denied' && (
        <div className="px-4 py-3 rounded-t-xl bg-red-500/10 border-b border-white/[0.06]">
          <p className="text-[11px] text-red-400/80 leading-snug">
            Notifications are blocked. Reset permission in your browser settings to enable them.
          </p>
        </div>
      )}

      {/* Permission request banner */}
      {supported && permissionStatus === 'default' && (
        <div className="px-4 py-3 rounded-t-xl bg-[#f59e0b]/10 border-b border-white/[0.06]">
          <button
            onClick={requestPermission}
            className="w-full flex items-center gap-2 text-[#f59e0b] text-xs font-medium hover:text-[#fbbf24] transition-colors"
          >
            <span>🔔</span>
            <span>Enable browser notifications</span>
            <span className="ml-auto text-white/30">→</span>
          </button>
        </div>
      )}

      {/* Main content */}
      {supported && (
        <div className="px-4 py-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-semibold text-white/70 uppercase tracking-widest">
              Notifications
            </span>
            <Toggle
              enabled={settings.enabled}
              onChange={(v) => updateSettings({ enabled: v })}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mb-3" />

          {/* Category rows */}
          <div className={`space-y-2.5 transition-opacity ${settings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            {CATEGORY_META.map(({ id, label, icon }) => (
              <div key={id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] select-none flex-shrink-0">{icon}</span>
                  <span className="text-[12px] text-white/60 truncate">{label}</span>
                </div>
                <Toggle
                  enabled={settings.categories[id]}
                  onChange={(v) => updateCategory(id, v)}
                />
              </div>
            ))}

            {/* Price threshold selector */}
            {settings.categories.price && (
              <div className="pt-1 pb-0.5">
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">
                  Price move threshold
                </p>
                <div className="flex gap-1.5">
                  {([3, 5, 10] as const).map((pct) => (
                    <button
                      key={pct}
                      onClick={() => updateSettings({ priceThreshold: pct })}
                      className={`flex-1 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                        settings.priceThreshold === pct
                          ? 'border-[#00A3FF] text-[#00A3FF] bg-[#00A3FF]/10'
                          : 'border-white/10 text-white/35 hover:border-white/20 hover:text-white/50'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent notifications */}
          {recentNotifications.length > 0 && (
            <>
              <div className="h-px bg-white/[0.06] mt-3 mb-2.5" />
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Recent</p>
              <div className="space-y-2">
                {recentNotifications.map((n) => {
                  const meta = CATEGORY_META.find((m) => m.id === n.category)
                  return (
                    <div key={n.id} className="flex items-start gap-2">
                      <span className="text-[12px] flex-shrink-0 mt-0.5 opacity-60">{meta?.icon ?? '🔔'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="text-[11px] text-white/70 font-medium truncate leading-snug">{n.title}</span>
                          <span className="text-[10px] text-white/25 flex-shrink-0">{timeAgo(n.firedAt)}</span>
                        </div>
                        <p className="text-[10px] text-white/35 leading-snug mt-0.5 line-clamp-2">{n.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Footer */}
          <p className="mt-3 text-[10px] text-white/20 leading-relaxed">
            Alerts fire once per 4–20h · Install as PWA for background delivery
          </p>
        </div>
      )}
    </div>
  )
}
