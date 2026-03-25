'use client'
import { evaluateAlerts, type AlertInputs, type AlertPriority } from '@/lib/alerts'

interface Props {
  inputs: AlertInputs
}

const PRIORITY_CONFIG: Record<AlertPriority, { dot: string; border: string; bg: string; label: string }> = {
  critical: {
    dot: '#ef4444',
    border: '#ef444430',
    bg: '#ef444408',
    label: 'CRITICAL',
  },
  warning: {
    dot: '#f97316',
    border: '#f9731630',
    bg: '#f9731608',
    label: 'WARNING',
  },
  info: {
    dot: '#3b82f6',
    border: '#3b82f630',
    bg: '#3b82f608',
    label: 'INFO',
  },
}

export function KeyAlerts({ inputs }: Props) {
  const alerts = evaluateAlerts(inputs)

  if (alerts.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-[#666] font-mono mb-3">Key Alerts</div>
        <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg px-4 py-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] flex-shrink-0" />
          <span className="text-[#22c55e] text-xs font-mono">All signals nominal — no active alerts</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-[#666] font-mono">Key Alerts</div>
        <div className="text-[10px] text-[#555] font-mono">{alerts.length} active</div>
      </div>
      {alerts.map((alert) => {
        const cfg = PRIORITY_CONFIG[alert.priority]
        return (
          <div
            key={alert.id}
            className="rounded-lg px-4 py-3 flex items-start gap-3 border"
            style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}
          >
            <span
              className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0"
              style={{ backgroundColor: cfg.dot }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold" style={{ color: cfg.dot }}>
                  {alert.title}
                </span>
                {alert.value && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      color: cfg.dot,
                      backgroundColor: cfg.border,
                    }}
                  >
                    {alert.value}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#666] font-mono mt-0.5">{alert.detail}</div>
            </div>
            <div
              className="text-[9px] font-mono font-bold tracking-widest flex-shrink-0 mt-0.5"
              style={{ color: cfg.dot, opacity: 0.6 }}
            >
              {cfg.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
