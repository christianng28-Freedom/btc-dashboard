'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useFearGreed } from '@/hooks/useFearGreed'
import { useFundamentalData } from '@/hooks/useFundamentalData'
import { useConvictionScore } from '@/hooks/useConvictionScore'
import {
  loadSettings,
  saveSettings,
  loadCooldowns,
  saveCooldowns,
  loadHistory,
  saveHistory,
  pushHistory,
  isCooledDown,
  markCooledDown,
  isNotificationSupported,
  COOLDOWN_HOURS,
  type NotificationSettings,
  type CooldownRecord,
  type NotificationCategory,
  type NotificationHistoryEntry,
} from '@/lib/notifications'
import macroCalendar from '@/data/macro-calendar.json'

interface CalendarEvent {
  date: string
  event: string
  period: string
  category: string
  description: string
}

interface NotificationContextValue {
  settings: NotificationSettings
  updateSettings: (patch: Partial<NotificationSettings>) => void
  updateCategory: (category: NotificationCategory, enabled: boolean) => void
  requestPermission: () => Promise<void>
  permissionStatus: NotificationPermission | 'unsupported'
  lastFiredAt: number | null
  recentNotifications: NotificationHistoryEntry[]
}

const NotificationContext = createContext<NotificationContextValue>({
  settings: {
    enabled: false,
    categories: { price: true, sentiment: true, conviction: true, funding: true, economic: true },
    priceThreshold: 5,
  },
  updateSettings: () => {},
  updateCategory: () => {},
  requestPermission: async () => {},
  permissionStatus: 'default',
  lastFiredAt: null,
  recentNotifications: [],
})

export function useNotifications() {
  return useContext(NotificationContext)
}

// Price alert check: throttle to at most once every 10 seconds
const PRICE_CHECK_INTERVAL_MS = 10_000

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    if (typeof window === 'undefined') return {
      enabled: true,
      categories: { price: true, sentiment: true, conviction: true, funding: true, economic: true },
      priceThreshold: 5,
    }
    return loadSettings()
  })
  const [cooldowns, setCooldowns] = useState<CooldownRecord>(() => {
    if (typeof window === 'undefined') return {}
    return loadCooldowns()
  })
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(
    () => {
      if (!isNotificationSupported()) return 'unsupported'
      return Notification.permission
    }
  )
  const [lastFiredAt, setLastFiredAt] = useState<number | null>(null)
  const [recentNotifications, setRecentNotifications] = useState<NotificationHistoryEntry[]>(() => {
    if (typeof window === 'undefined') return []
    return loadHistory()
  })

  // Refs for throttling and threshold crossing
  const lastPriceCheckRef = useRef<number>(0)
  const prevConvictionRef = useRef<number | null>(null)

  // Live data
  const { priceChangePercent } = useWebSocket()
  const { current: fgCurrent } = useFearGreed()
  const { data: fundData } = useFundamentalData()
  const { score: convictionScore } = useConvictionScore()

  const updateSettings = useCallback((patch: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const updateCategory = useCallback((category: NotificationCategory, enabled: boolean) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        categories: { ...prev.categories, [category]: enabled },
      }
      saveSettings(next)
      return next
    })
  }, [])

  const requestPermission = useCallback(async () => {
    if (!isNotificationSupported()) return
    const result = await Notification.requestPermission()
    setPermissionStatus(result)
  }, [])

  const fireNotification = useCallback(
    (title: string, body: string, tag: string, category: NotificationCategory) => {
      if (!isNotificationSupported()) return
      if (Notification.permission !== 'granted') return
      if (!settings.enabled) return
      if (!settings.categories[category]) return
      if (isCooledDown(tag, cooldowns, COOLDOWN_HOURS[category])) return

      // Update cooldowns
      const nextCooldowns = markCooledDown(tag, cooldowns)
      setCooldowns(nextCooldowns)
      saveCooldowns(nextCooldowns)
      const now = Date.now()
      setLastFiredAt(now)

      // Store in history
      setRecentNotifications((prev) => {
        const next = pushHistory({ title, body, category, firedAt: now }, prev)
        saveHistory(next)
        return next
      })

      const icon = '/apple-touch-icon.png'
      const options: NotificationOptions = { body, tag, icon }

      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        new Notification(title, options)
      } else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            if (reg.active) {
              reg.active.postMessage({ type: 'SHOW_NOTIFICATION', title, body, tag, icon })
            }
          })
          .catch(() => {
            // Fallback: try direct notification
            new Notification(title, options)
          })
      }
    },
    [settings, cooldowns]
  )

  // ── Price Alert ──────────────────────────────────────────────────────
  useEffect(() => {
    if (priceChangePercent === null) return
    if (!settings.enabled || !settings.categories.price) return

    const now = Date.now()
    if (now - lastPriceCheckRef.current < PRICE_CHECK_INTERVAL_MS) return
    lastPriceCheckRef.current = now

    const absChange = Math.abs(priceChangePercent)
    const threshold = settings.priceThreshold
    if (absChange < threshold) return

    const direction = priceChangePercent > 0 ? '▲' : '▼'
    const sign = priceChangePercent > 0 ? '+' : ''
    fireNotification(
      `BTC ${direction} ${sign}${priceChangePercent.toFixed(1)}% Today`,
      `Bitcoin has moved ${sign}${priceChangePercent.toFixed(2)}% from yesterday's close.`,
      'price-alert',
      'price'
    )
  }, [priceChangePercent, settings.enabled, settings.categories.price, settings.priceThreshold, fireNotification])

  // ── Sentiment Extremes ───────────────────────────────────────────────
  useEffect(() => {
    if (!fgCurrent) return
    if (!settings.enabled || !settings.categories.sentiment) return

    const value = parseInt(fgCurrent.value, 10)
    if (isNaN(value)) return

    if (value < 20) {
      fireNotification(
        `Extreme Fear — F&G ${value}`,
        `Market sentiment has entered extreme fear territory (${fgCurrent.value_classification}).`,
        'sentiment',
        'sentiment'
      )
    } else if (value > 80) {
      fireNotification(
        `Extreme Greed — F&G ${value}`,
        `Market sentiment has entered extreme greed territory (${fgCurrent.value_classification}).`,
        'sentiment',
        'sentiment'
      )
    }
  }, [fgCurrent, settings.enabled, settings.categories.sentiment, fireNotification])

  // ── Funding Rate ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!fundData) return
    if (!settings.enabled || !settings.categories.funding) return

    const rate = fundData.annualisedFundingRate
    if (rate > 50) {
      fireNotification(
        `Funding Rate +${rate.toFixed(0)}% Ann.`,
        `BTC perpetual funding is overheated — leveraged longs at elevated liquidation risk.`,
        'funding',
        'funding'
      )
    } else if (rate < -30) {
      fireNotification(
        `Funding Rate ${rate.toFixed(0)}% Ann.`,
        `BTC perpetual funding is deeply negative — potential short squeeze conditions.`,
        'funding',
        'funding'
      )
    }
  }, [fundData, settings.enabled, settings.categories.funding, fireNotification])

  // ── Conviction Score ─────────────────────────────────────────────────
  useEffect(() => {
    if (convictionScore === null) return
    if (!settings.enabled || !settings.categories.conviction) return

    const prev = prevConvictionRef.current
    prevConvictionRef.current = convictionScore

    if (prev === null) return // skip first read — no crossing to detect

    // Detect threshold crossings
    const crossedBelow40 = prev >= 40 && convictionScore < 40
    const crossedAbove70 = prev <= 70 && convictionScore > 70
    const crossedAbove40From40 = prev < 40 && convictionScore >= 40

    if (crossedBelow40) {
      fireNotification(
        `Conviction Score Below 40`,
        `Overall score dropped to ${convictionScore.toFixed(0)} — bearish conditions detected.`,
        'conviction',
        'conviction'
      )
    } else if (crossedAbove70) {
      fireNotification(
        `Conviction Score Above 70`,
        `Overall score rose to ${convictionScore.toFixed(0)} — bullish signal confirmed.`,
        'conviction',
        'conviction'
      )
    } else if (crossedAbove40From40) {
      fireNotification(
        `Conviction Score Recovered`,
        `Overall score recovered to ${convictionScore.toFixed(0)} — conditions improving.`,
        'conviction',
        'conviction'
      )
    }
  }, [convictionScore, settings.enabled, settings.categories.conviction, fireNotification])

  // ── Economic Calendar ────────────────────────────────────────────────
  useEffect(() => {
    if (!settings.enabled || !settings.categories.economic) return

    const checkCalendar = () => {
      const todayUtc = new Date().toISOString().slice(0, 10)
      const events = macroCalendar as CalendarEvent[]
      const todaysEvents = events.filter((e) => e.date === todayUtc)

      for (const event of todaysEvents) {
        const key = `econ-${event.date}-${event.event}`
        fireNotification(
          `${event.event} Release Day`,
          `${event.description} data for ${event.period} is due today.`,
          key,
          'economic'
        )
      }
    }

    checkCalendar()

    // Re-check every 6 hours in case the app is left open across midnight
    const interval = setInterval(checkCalendar, 6 * 3_600_000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enabled, settings.categories.economic])

  return (
    <NotificationContext.Provider
      value={{
        settings,
        updateSettings,
        updateCategory,
        requestPermission,
        permissionStatus,
        lastFiredAt,
        recentNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
