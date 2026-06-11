import type { AgentDefinition } from './runner'
import { momentumAgent } from './momentum'
import { newsAgent } from './news'
import { scoutAgent } from './scout'

/**
 * Registry of analyst agents, keyed by the name used in
 * /api/agents/[agent]/run and in report storage.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AGENTS: Record<string, AgentDefinition<any>> = {
  momentum: momentumAgent,
  news: newsAgent,
  scout: scoutAgent,
}

export const AGENT_TITLES: Record<string, string> = Object.fromEntries(
  Object.values(AGENTS).map((a) => [a.name, a.title]),
)
