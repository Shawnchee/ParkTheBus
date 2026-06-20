import { cached } from './cache'
import { getOdds } from './odds'

const BASE = 'https://v3.football.api-sports.io'

export interface Fixture {
  id: number
  home: string
  away: string
  league: string
  kickoff: string // ISO
  status: string
}

// Real FIFA World Cup 2026 group-stage fixtures around the current date
// (used only when no FOOTBALL_API_KEY is set — the live api-football call
// returns the real schedule when a key is present).
function mockFixtures(): Fixture[] {
  const now = Date.now()
  const mk = (id: number, home: string, away: string, mins: number): Fixture => ({
    id,
    home,
    away,
    league: 'FIFA World Cup 2026',
    kickoff: new Date(now + mins * 60_000).toISOString(),
    status: 'NS',
  })
  return [
    mk(2001, 'Netherlands', 'Sweden', 120),
    mk(2002, 'Germany', 'Ivory Coast', 300),
    mk(2003, 'Ecuador', 'Curaçao', 540),
    mk(2004, 'Türkiye', 'Paraguay', 900),
    mk(2005, 'Tunisia', 'Japan', 1140),
  ]
}

export async function getFixtures(): Promise<{ source: string; fixtures: Fixture[] }> {
  const key = process.env.FOOTBALL_API_KEY
  if (key) {
    const live = await cached('fixtures', 60 * 60 * 1000, async () => {
      try {
        const res = await fetch(`${BASE}/fixtures?league=1&season=2026&next=20`, {
          headers: { 'x-apisports-key': key },
        })
        if (!res.ok) return [] as Fixture[]
        const data = (await res.json()) as Record<string, any>
        return (data.response ?? []).map((f: any) => ({
          id: f.fixture.id,
          home: f.teams.home.name,
          away: f.teams.away.name,
          league: f.league.name,
          kickoff: f.fixture.date,
          status: f.fixture.status.short,
        })) as Fixture[]
      } catch {
        return [] as Fixture[]
      }
    })
    if (live.length) return { source: 'api-football', fixtures: live }
  }

  // api-football free tier only covers 2021-2023, so it's empty for WC2026.
  // Derive live matchups from The Odds API (which has the current event).
  try {
    const odds = await getOdds()
    if (odds.lines.length) {
      const fixtures: Fixture[] = odds.lines.map((l, i) => ({
        id: 3000 + i,
        home: l.home,
        away: l.away,
        league: 'FIFA World Cup 2026',
        kickoff: new Date().toISOString(),
        status: 'NS',
      }))
      return { source: 'odds-api', fixtures }
    }
  } catch {
    /* fall through */
  }
  return { source: 'mock', fixtures: mockFixtures() }
}

export async function getResult(
  fixtureId: number,
): Promise<{ source: 'live' | 'mock'; result: { status: string; home: number; away: number } | null }> {
  const key = process.env.FOOTBALL_API_KEY
  if (!key) return { source: 'mock', result: null }
  return cached(`result:${fixtureId}`, 2 * 60 * 1000, async () => {
    try {
      const res = await fetch(`${BASE}/fixtures?id=${fixtureId}`, {
        headers: { 'x-apisports-key': key },
      })
      const data = (await res.json()) as Record<string, any>
      const f = data.response?.[0]
      return {
        source: 'live' as const,
        result: f
          ? { status: f.fixture.status.short, home: f.goals.home, away: f.goals.away }
          : null,
      }
    } catch {
      return { source: 'mock' as const, result: null }
    }
  })
}
