// Runs once at Next.js server startup (Node.js runtime only).
// Schedules a daily briefing pre-generation at 08:00 HKT (= 00:00 UTC).
// This ensures the brief is cached before the user opens the page each morning.

function msUntilNext8amHKT(): number {
  const now = Date.now()
  // HKT is UTC+8 — calculate current HKT time of day in ms
  const hktNow = new Date(now + 8 * 3600 * 1000)
  const hktMidnight = new Date(hktNow)
  hktMidnight.setUTCHours(0, 0, 0, 0)
  const hktMs = hktNow.getTime() - hktMidnight.getTime()
  const target8amMs = 8 * 3600 * 1000   // 08:00 in ms from midnight HKT

  let delay = target8amMs - hktMs
  if (delay <= 0) delay += 24 * 3600 * 1000  // already past 8am today → next day
  return delay
}

async function prewarmBriefing(): Promise<void> {
  try {
    const port = process.env.PORT ?? '3000'
    const res = await fetch(`http://localhost:${port}/api/briefing`)
    const data = await res.json() as { source: string }
    console.log(`[briefing-scheduler] ${new Date().toISOString()} — source: ${data.source}`)
  } catch (err) {
    console.warn('[briefing-scheduler] Pre-warm failed:', err)
  }
  // Schedule next fire in 24 hours
  setTimeout(prewarmBriefing, 24 * 3600 * 1000)
}

export function register() {
  // Only run in the Node.js server process, not in the Edge runtime
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const delay = msUntilNext8amHKT()
  const nextFire = new Date(Date.now() + delay)
  console.log(
    `[briefing-scheduler] Next 08:00 HKT pre-warm scheduled for ${nextFire.toISOString()} (in ${Math.round(delay / 60000)} min)`
  )
  setTimeout(prewarmBriefing, delay)
}
