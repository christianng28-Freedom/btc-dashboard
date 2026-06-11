import { promises as fs } from 'fs'
import { join } from 'path'

/**
 * Minimal key-value store for agent reports, watchlists, and run locks.
 *
 * Driver selection:
 *  - Upstash Redis REST when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *    are set (durable — required in production for report history)
 *  - JSON files otherwise (local dev; /tmp on Vercel, which is ephemeral per
 *    lambda instance — fine for trying things out, not for history)
 */

export interface KVStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
}

// ── Upstash REST driver ───────────────────────────────────────────────────────

class UpstashStore implements KVStore {
  constructor(private url: string, private token: string) {}

  private async command<R>(cmd: unknown[]): Promise<R> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Upstash error: ${res.status} ${await res.text()}`)
    const json = (await res.json()) as { result: R }
    return json.result
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.command<string | null>(['GET', key])
    if (raw == null) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const cmd: unknown[] = ['SET', key, JSON.stringify(value)]
    if (ttlSeconds) cmd.push('EX', ttlSeconds)
    await this.command(cmd)
  }

  async del(key: string): Promise<void> {
    await this.command(['DEL', key])
  }
}

// ── File driver (dev / ephemeral fallback) ────────────────────────────────────

class FileStore implements KVStore {
  private dir: string

  constructor() {
    this.dir = process.env.VERCEL ? '/tmp/btc-command-kv' : join(process.cwd(), '.data', 'kv')
  }

  private pathFor(key: string): string {
    // Keys contain ':' which is illegal in Windows filenames
    return join(this.dir, key.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json')
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(this.pathFor(key), 'utf-8')
      const entry = JSON.parse(raw) as { value: T; expiresAt: number | null }
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await this.del(key)
        return null
      }
      return entry.value
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true })
    const entry = { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null }
    await fs.writeFile(this.pathFor(key), JSON.stringify(entry), 'utf-8')
  }

  async del(key: string): Promise<void> {
    try {
      await fs.unlink(this.pathFor(key))
    } catch {
      // already gone
    }
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

let store: KVStore | null = null

// The Vercel Marketplace Upstash integration injects KV_REST_API_* names;
// a directly-created Upstash database uses UPSTASH_REDIS_REST_* — accept both
function redisCreds(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  return url && token ? { url, token } : null
}

export function getStore(): KVStore {
  if (store) return store
  const creds = redisCreds()
  store = creds ? new UpstashStore(creds.url, creds.token) : new FileStore()
  return store
}

export function isDurableStore(): boolean {
  return redisCreds() != null
}

// ── Report helpers (shared by all agents) ────────────────────────────────────

export interface AgentReport<TStructured = Record<string, unknown>> {
  id: string
  agent: string
  generatedAt: string // ISO
  structured: TStructured
  markdown: string
}

const REPORT_INDEX_MAX = 60

export async function saveReport(report: AgentReport): Promise<void> {
  const kv = getStore()
  await kv.set(`report:${report.id}`, report)
  const idxKey = `reports:${report.agent}`
  const ids = (await kv.get<string[]>(idxKey)) ?? []
  await kv.set(idxKey, [report.id, ...ids.filter((i) => i !== report.id)].slice(0, REPORT_INDEX_MAX))
}

export async function listReports(agent: string, limit = 20): Promise<AgentReport[]> {
  const kv = getStore()
  const ids = (await kv.get<string[]>(`reports:${agent}`)) ?? []
  const reports = await Promise.all(ids.slice(0, limit).map((id) => kv.get<AgentReport>(`report:${id}`)))
  return reports.filter((r): r is AgentReport => r != null)
}

export async function latestReport(agent: string): Promise<AgentReport | null> {
  const reports = await listReports(agent, 1)
  return reports[0] ?? null
}

// ── Run lock (prevents overlapping agent runs) ───────────────────────────────

export async function acquireRunLock(agent: string, ttlSeconds = 600): Promise<boolean> {
  const kv = getStore()
  const key = `lock:${agent}`
  const existing = await kv.get<{ at: number }>(key)
  if (existing && Date.now() - existing.at < ttlSeconds * 1000) return false
  await kv.set(key, { at: Date.now() }, ttlSeconds)
  return true
}

export async function releaseRunLock(agent: string): Promise<void> {
  await getStore().del(`lock:${agent}`)
}
