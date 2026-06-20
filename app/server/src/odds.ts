import { cached } from './cache'

const BASE = 'https://api.the-odds-api.com/v4'

export interface OddsLine {
  event: string
  home: string
  away: string
  homeOddsX: number
  drawOddsX?: number
  awayOddsX: number
}

function mockOdds(): OddsLine[] {
  return [
    { event: 'Brazil vs France', home: 'Brazil', away: 'France', homeOddsX: 2.1, drawOddsX: 3.4, awayOddsX: 3.6 },
    { event: 'England vs Spain', home: 'England', away: 'Spain', homeOddsX: 2.55, drawOddsX: 3.2, awayOddsX: 2.85 },
    { event: 'Argentina vs Germany', home: 'Argentina', away: 'Germany', homeOddsX: 2.3, drawOddsX: 3.3, awayOddsX: 3.1 },
  ]
}

/** h2h odds for a sport. Falls back to mock data when no key is configured. */
export async function getOdds(
  sport = 'soccer_fifa_world_cup',
): Promise<{ source: 'live' | 'mock'; lines: OddsLine[] }> {
  const key = process.env.ODDS_API_KEY
  if (!key) return { source: 'mock', lines: mockOdds() }
  return cached(`odds:${sport}`, 5 * 60 * 1000, async () => {
    try {
      const url = `${BASE}/sports/${sport}/odds?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${key}`
      const res = await fetch(url)
      if (!res.ok) return { source: 'mock' as const, lines: mockOdds() }
      const data = (await res.json()) as Array<Record<string, any>>
      const lines: OddsLine[] = data.slice(0, 12).map((g) => {
        const mkt = g.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'h2h')
        const price = (name: string) =>
          mkt?.outcomes?.find((o: any) => o.name === name)?.price ?? 0
        return {
          event: `${g.home_team} vs ${g.away_team}`,
          home: g.home_team,
          away: g.away_team,
          homeOddsX: price(g.home_team),
          drawOddsX: price('Draw') || undefined,
          awayOddsX: price(g.away_team),
        }
      })
      return { source: 'live' as const, lines }
    } catch {
      return { source: 'mock' as const, lines: mockOdds() }
    }
  })
}
