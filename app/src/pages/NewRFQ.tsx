import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useActions } from '../hooks/useActions'
import { aiRfqAdvisor, getFixtures, type Fixture } from '../lib/api'
import { oddsToBps, solToLamports, fmtSol } from '../lib/format'
import { RFQ_DEPOSIT_LAMPORTS } from '../config'
import AIAdvisor from '../components/AIAdvisor'
import ParlayBuilder from '../components/ParlayBuilder'
import { ArrowLeft, AlertTriangle, Info } from '../components/Icon'

type Mode = 'standard' | 'custom' | 'parlay'

function standardEvents(home: string, away: string) {
  return [
    `${home} WIN`,
    `${away} WIN`,
    'Draw',
    'Over 2.5 goals',
    'Both teams to score',
  ]
}

function fmtKickoff(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function NewRFQ() {
  const { connected } = useWallet()
  const { postRfq } = useActions()
  const nav = useNavigate()

  const [mode, setMode] = useState<Mode>('standard')
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [fixturesLoading, setFixturesLoading] = useState(true)
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [matchId, setMatchId] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => {
    getFixtures()
      .then((r) => {
        const upcoming = r.fixtures.filter((f) => f.status === 'NS' || f.status === 'upcoming' || !f.status)
        const list = upcoming.length ? upcoming : r.fixtures
        setFixtures(list)
        if (list.length) {
          const first = list[0]
          setSelectedFixture(first)
          setMatchId(String(first.id))
          setDesc(standardEvents(first.home, first.away)[0])
        }
      })
      .catch(() => {})
      .finally(() => setFixturesLoading(false))
  }, [])

  const handleFixtureChange = (id: string) => {
    const fixture = fixtures.find((f) => String(f.id) === id) ?? null
    setSelectedFixture(fixture)
    setMatchId(id)
    if (fixture) setDesc(standardEvents(fixture.home, fixture.away)[0])
  }
  const [stake, setStake] = useState('0.5')
  const [minOdds, setMinOdds] = useState('2.0')
  const [expiryMin, setExpiryMin] = useState('30')
  const [legs, setLegs] = useState<string[]>(['Brazil WIN', 'Ronaldo scores'])
  const [busy, setBusy] = useState(false)

  const stakeNum = parseFloat(stake) || 0
  const oddsNum = parseFloat(minOdds) || 0
  const minOddsBps = oddsToBps(oddsNum)
  const liveLegs = legs.filter((l) => l.trim())
  const eventLabel = mode === 'parlay' ? `${liveLegs.length}-leg parlay` : desc

  const valid =
    matchId.length > 0 &&
    stakeNum > 0 &&
    oddsNum > 1 &&
    (mode === 'parlay' ? liveLegs.length >= 2 : desc.trim().length > 0)

  const submit = async () => {
    setBusy(true)
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + (parseInt(expiryMin) || 30) * 60
      const id = await postRfq({
        matchId,
        eventDescription: eventLabel,
        eventType: mode === 'custom' ? 'custom' : 'standard',
        stakeLamports: solToLamports(stakeNum),
        minOddsBps,
        expiresAt,
        kickoffAt: 0,
        isParlay: mode === 'parlay',
        legs: mode === 'parlay' ? liveLegs : [],
      })
      nav(`/rfq/${id}`)
    } catch {
      /* toast already shown */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition hover:text-accent">
        <ArrowLeft size={15} /> Back to feed
      </Link>
      <h1 className="mb-1 font-display text-3xl font-bold tracking-tightest">Post an RFQ</h1>
      <p className="mb-6 text-sm text-text-muted">
        Describe the bet you want. Market makers compete to quote you the best odds.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* form */}
        <div className="space-y-5">
          <div className="segmented w-full">
            {(['standard', 'custom', 'parlay'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`seg flex-1 capitalize ${mode === m ? 'seg-on text-accent' : ''}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div>
            <label className="label">Match</label>
            <select
              className="input mt-1"
              value={matchId}
              onChange={(e) => handleFixtureChange(e.target.value)}
              disabled={fixturesLoading}
            >
              {fixturesLoading && <option>Loading fixtures…</option>}
              {fixtures.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.home} vs {f.away} — {f.league} · {fmtKickoff(f.kickoff)}
                </option>
              ))}
            </select>
          </div>

          {mode === 'standard' && (
            <div>
              <label className="label">Event</label>
              <select className="input mt-1" value={desc} onChange={(e) => setDesc(e.target.value)}>
                {(selectedFixture
                  ? standardEvents(selectedFixture.home, selectedFixture.away)
                  : ['Draw', 'Over 2.5 goals', 'Both teams to score']
                ).map((ev) => (
                  <option key={ev}>{ev}</option>
                ))}
              </select>
            </div>
          )}

          {mode === 'custom' && (
            <div>
              <label className="label">Custom event</label>
              <input
                className="input mt-1"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g. Ronaldo to cry"
              />
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle size={13} /> Custom events go to the council for approval before
                they're quotable.
              </p>
            </div>
          )}

          {mode === 'parlay' && (
            <div>
              <label className="label">Legs (all-or-nothing)</label>
              <div className="mt-1">
                <ParlayBuilder legs={legs} setLegs={setLegs} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Stake (SOL)</label>
              <input
                className="input mt-1"
                type="number"
                step="0.1"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Min odds</label>
              <input
                className="input mt-1"
                type="number"
                step="0.1"
                value={minOdds}
                onChange={(e) => setMinOdds(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Expiry (min)</label>
              <input
                className="input mt-1"
                type="number"
                value={expiryMin}
                onChange={(e) => setExpiryMin(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-2/40 p-3.5 text-xs leading-relaxed text-text-muted">
            <Info size={15} className="mt-px shrink-0 text-text-secondary" />
            <span>
              A refundable{' '}
              <span className="font-medium text-text-secondary">{fmtSol(RFQ_DEPOSIT_LAMPORTS)}</span>{' '}
              spam-prevention deposit is locked when you post. It's returned when the RFQ is matched
              + settled (or cancelled/expired).
            </span>
          </div>

          <button
            className="btn-accent w-full"
            disabled={!connected || !valid || busy}
            onClick={submit}
          >
            {!connected ? 'Connect wallet to post' : busy ? 'Posting…' : 'Post RFQ'}
          </button>
        </div>

        {/* AI advisor */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <AIAdvisor
            title="RFQ Pricing Advisor"
            enabled={valid}
            placeholder="Enter an event + minimum odds for pricing guidance."
            fetcher={() =>
              aiRfqAdvisor({ eventDescription: eventLabel, minOddsBps })
            }
            deps={[eventLabel, minOddsBps]}
          />
        </div>
      </div>
    </div>
  )
}
