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
export const getFixtures = () => get<{ source: string; fixtures: Fixture[] }>('/fixtures')
