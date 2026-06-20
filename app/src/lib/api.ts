import { API_BASE } from '../config'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return res.json() as Promise<T>
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export interface Advice {
  text: string
  ai: boolean
}

export const aiRfqAdvisor = (b: {
  eventDescription: string
  minOddsBps: number
  marketOddsBps?: number
}) => post<Advice>('/ai/rfq-advisor', b)

export const aiMmAssistant = (b: {
  eventDescription: string
  minOddsBps: number
  offeredOddsBps: number
  bestCompetingBps?: number
  marketOddsBps?: number
}) => post<Advice>('/ai/mm-assistant', b)

export const aiContractSummary = (b: {
  eventDescription: string
  stakeLamports: number
  oddsBps: number
  marketMaker: string
  mmMarkets?: number
}) => post<Advice>('/ai/contract-summary', b)

export interface OddsLine {
  event: string
  home: string
  away: string
  homeOddsX: number
  drawOddsX?: number
  awayOddsX: number
}
export const getOdds = () => get<{ source: string; lines: OddsLine[] }>('/odds')

export interface Fixture {
  id: number
  home: string
  away: string
  league: string
  kickoff: string
  status: string
}

// FIFA World Cup 2026 fixtures for the next few days. Used when the /api proxy
// isn't reachable (e.g. a static deploy with no server) so the match selector
// and fixtures banner are always populated. Kickoffs are derived from the
// current time so they always read as upcoming.
function fallbackFixtures(): Fixture[] {
  const now = Date.now()
  const HOUR = 60 * 60 * 1000
  const DAY = 24 * HOUR
  const mk = (id: number, home: string, away: string, offset: number): Fixture => ({
    id,
    home,
    away,
    league: 'FIFA World Cup 2026',
    kickoff: new Date(now + offset).toISOString(),
    status: 'NS',
  })
  return [
    mk(4001, 'Argentina', 'Croatia', 3 * HOUR),
    mk(4002, 'France', 'Morocco', 6 * HOUR),
    mk(4003, 'Brazil', 'Portugal', DAY + 2 * HOUR),
    mk(4004, 'England', 'Netherlands', DAY + 5 * HOUR),
    mk(4005, 'Spain', 'Germany', 2 * DAY + 3 * HOUR),
    mk(4006, 'USA', 'Mexico', 2 * DAY + 6 * HOUR),
    mk(4007, 'Belgium', 'Uruguay', 3 * DAY + 2 * HOUR),
    mk(4008, 'Japan', 'Senegal', 3 * DAY + 5 * HOUR),
  ]
}

export const getFixtures = async (): Promise<{ source: string; fixtures: Fixture[] }> => {
  try {
    const r = await get<{ source: string; fixtures: Fixture[] }>('/fixtures')
    if (r.fixtures?.length) return r
  } catch {
    /* proxy unavailable — fall back to bundled fixtures */
  }
  return { source: 'fallback', fixtures: fallbackFixtures() }
}
