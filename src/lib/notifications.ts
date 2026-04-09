export type NotificationCategory = 'price' | 'sentiment' | 'conviction' | 'funding' | 'economic'

export interface NotificationSettings {
  enabled: boolean
  categories: Record<NotificationCategory, boolean>
  priceThreshold: 3 | 5 | 10
}

export interface CooldownRecord {
  [key: string]: number | null
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  categories: {
    price: true,
    sentiment: true,
    conviction: true,
    funding: true,
    economic: true,
  },
  priceThreshold: 5,
}

// Cooldown durations in hours per category
export const COOLDOWN_HOURS: Record<NotificationCategory, number> = {
  price: 4,
  sentiment: 12,
  conviction: 8,
  funding: 6,
  economic: 20,
}

export interface NotificationHistoryEntry {
  id: string
  title: string
  body: string
  category: NotificationCategory
  firedAt: number
}

const SETTINGS_KEY = 'cmd-notification-settings'
const COOLDOWNS_KEY = 'cmd-notification-cooldowns'
const HISTORY_KEY = 'cmd-notification-history'
const MAX_HISTORY = 4

export function loadSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      categories: { ...DEFAULT_SETTINGS.categories, ...(parsed.categories ?? {}) },
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export function loadCooldowns(): CooldownRecord {
  try {
    const raw = localStorage.getItem(COOLDOWNS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CooldownRecord
  } catch {
    return {}
  }
}

export function saveCooldowns(cooldowns: CooldownRecord): void {
  try {
    localStorage.setItem(COOLDOWNS_KEY, JSON.stringify(cooldowns))
  } catch {
    // ignore
  }
}

export function isCooledDown(
  key: string,
  cooldowns: CooldownRecord,
  cooldownHours: number
): boolean {
  const lastFired = cooldowns[key]
  if (!lastFired) return false
  return Date.now() - lastFired < cooldownHours * 3_600_000
}

export function markCooledDown(key: string, cooldowns: CooldownRecord): CooldownRecord {
  return { ...cooldowns, [key]: Date.now() }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function loadHistory(): NotificationHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as NotificationHistoryEntry[]
  } catch {
    return []
  }
}

export function saveHistory(entries: NotificationHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
  } catch {
    // ignore
  }
}

export function pushHistory(
  entry: Omit<NotificationHistoryEntry, 'id'>,
  current: NotificationHistoryEntry[]
): NotificationHistoryEntry[] {
  const next: NotificationHistoryEntry = { ...entry, id: `${entry.category}-${entry.firedAt}` }
  return [next, ...current].slice(0, MAX_HISTORY)
}
