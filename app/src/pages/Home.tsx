import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BN from 'bn.js'
import { useRfqFeed } from '../hooks/useData'
import { enumKey } from '../lib/anchor'
import { getFixtures, type Fixture } from '../lib/api'
import { fmtSol } from '../lib/format'
import RFQCard from '../components/RFQCard'
import {
  Plus,
  Refresh,
  ArrowRight,
  Trophy,
} from '../components/Icon'

type Filter = 'all' | 'standard' | 'custom' | 'parlay'
type Sort = 'newest' | 'stake' | 'quoted' | 'expiring'

function FixturesBanner() {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  useEffect(() => {
    getFixtures()
      .then((r) => setFixtures(r.fixtures))
      .catch(() => {})
  }, [])
  if (!fixtures.length) return null
  const row = [...fixtures, ...fixtures]
  return (
    <div className="mb-6 flex items-stretch overflow-hidden rounded-xl border border-border bg-surface/60">
      <span className="label flex shrink-0 items-center gap-1.5 border-r border-border bg-surface-2/60 px-4 text-accent">
        <span className="h-1.5 w-1.5 animate-odds-pulse rounded-full bg-accent" /> Live
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap py-2.5 pl-6 text-xs text-text-muted">
          {row.map((f, i) => (
            <span key={`${f.id}-${i}`} className="shrink-0">
              <span className="font-medium text-text-secondary">{f.home}</span>
              <span className="mx-1.5 text-text-muted/60">vs</span>
              <span className="font-medium text-text-secondary">{f.away}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { data, loading, refresh } = useRfqFeed()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('newest')

  const open = useMemo(
    () =>
      (data ?? []).filter((x) =>
        ['open', 'pendingApproval'].includes(enumKey((x.account as any).status)),
      ),
    [data],
  )

  const items = useMemo(() => {
    let xs = open
    if (filter === 'standard')
      xs = xs.filter(
        (x) => enumKey((x.account as any).eventType) === 'standard' && !(x.account as any).isParlay,
      )
    if (filter === 'custom')
      xs = xs.filter((x) => enumKey((x.account as any).eventType) === 'custom')
    if (filter === 'parlay') xs = xs.filter((x) => (x.account as any).isParlay)

    const n = (b: BN) => b.toNumber()
    const s = [...xs]
    if (sort === 'newest') s.sort((a, b) => n((b.account as any).rfqId) - n((a.account as any).rfqId))
    if (sort === 'stake') s.sort((a, b) => n((b.account as any).stake) - n((a.account as any).stake))
    if (sort === 'quoted') s.sort((a, b) => (b.account as any).quoteCount - (a.account as any).quoteCount)
    if (sort === 'expiring') s.sort((a, b) => n((a.account as any).expiresAt) - n((b.account as any).expiresAt))
    return s
  }, [open, filter, sort])

  const totalStake = useMemo(
    () => open.reduce((s, x) => s + ((x.account as any).stake as BN).toNumber(), 0),
    [open],
  )
  const totalQuotes = useMemo(
    () => open.reduce((s, x) => s + (x.account as any).quoteCount, 0),
    [open],
  )

  const FILTERS: [Filter, string][] = [
    ['all', 'All'],
    ['standard', 'Standard'],
    ['custom', 'Custom'],
    ['parlay', 'Parlays'],
  ]

  return (
    <div className="animate-fade-up">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-border">
        <img
          src="/hero-stars.jpeg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        {/* scrims: darken the left for copy, sink the bottom into the page */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/92 to-bg/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />

        <div className="relative px-6 py-11 sm:px-10 sm:py-14 lg:py-16">
          <div className="max-w-xl">
            <p className="label inline-flex items-center gap-1.5 text-text-secondary">
              <span className="h-1.5 w-1.5 animate-odds-pulse rounded-full bg-accent" />
              Solana devnet · World Cup · 0% house edge
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tightest sm:text-5xl lg:text-6xl">
              Name your bet.
              <br />
              <span className="text-accent">Make them quote you.</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-text-secondary">
              A peer-to-peer book for football. You post the bet you want — market makers compete
              to price it. Best odds win, settled on-chain. No house edge.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/rfq/new" className="btn-accent px-5 py-2.5 text-[15px]">
                <Plus size={17} /> Post an RFQ
              </Link>
              <Link to="/market-maker" className="btn-ghost px-5 py-2.5 text-[15px]">
                Make markets <ArrowRight size={16} />
              </Link>
            </div>

            {/* live data — one strip, not three metric cards */}
            <dl className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <HeroStat label="open markets" value={loading && !data ? '—' : String(open.length)} />
              <span className="h-4 w-px bg-border-strong" aria-hidden />
              <HeroStat label="live stake" value={loading && !data ? '—' : fmtSol(totalStake, 2)} accent />
              <span className="h-4 w-px bg-border-strong" aria-hidden />
              <HeroStat label="quotes posted" value={loading && !data ? '—' : String(totalQuotes)} />
            </dl>
          </div>
        </div>
      </section>

      <FixturesBanner />

      {/* ── Feed ───────────────────────────────────────────── */}
      <div id="feed" className="mb-5 flex flex-wrap items-center justify-between gap-3 scroll-mt-24">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg font-bold">Live markets</h2>
          <div className="segmented">
            {FILTERS.map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)} className={`seg ${filter === f ? 'seg-on text-accent' : ''}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input w-auto cursor-pointer py-2 text-sm">
            <option value="newest">Newest</option>
            <option value="stake">Highest stake</option>
            <option value="quoted">Most quoted</option>
            <option value="expiring">Expiring soon</option>
          </select>
          <button onClick={refresh} aria-label="Refresh feed" className="btn-ghost h-[42px] w-[42px] px-0">
            <Refresh size={16} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-[148px] p-4">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton mt-2 h-3 w-1/3" />
              <div className="mt-6 grid grid-cols-3 gap-2">
                <div className="skeleton h-8" /><div className="skeleton h-8" /><div className="skeleton h-8" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-2 text-text-muted">
            <Trophy size={26} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-text-primary">No open markets yet</p>
            <p className="mt-1 text-sm text-text-muted">Be the first to post — quotes come to you.</p>
          </div>
          <Link to="/rfq/new" className="btn-accent">
            <Plus size={16} /> Post an RFQ
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <RFQCard key={it.publicKey.toBase58()} item={it} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────── */

function HeroStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <dd
        className={`font-display text-xl font-bold tnum tracking-tight ${
          accent ? 'text-accent' : 'text-text-primary'
        }`}
      >
        {value}
      </dd>
      <dt className="label">{label}</dt>
    </div>
  )
}

