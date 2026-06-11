'use client'
import { useEffect } from 'react'

export function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // The SW's offline cache serves stale JS/CSS chunks against a live dev
    // server (HMR markup + old styles) — register it in production only,
    // and actively unregister any leftover dev registration
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister()
      }).catch(() => {})
      return
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
