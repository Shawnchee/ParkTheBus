/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import BN from 'bn.js'
import { useRfqFeed } from '../hooks/useData'
import { useActions } from '../hooks/useActions'
import { useProgram, enumKey } from '../lib/anchor'
import { mmVaultPda } from '../lib/pdas'
import {
  fmtSol,
  fmtOdds,
  bpsToOdds,
  oddsToBps,
  collateralFor,
  timeLeft,
  vaultFree,
} from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import OddsDisplay from '../components/OddsDisplay'
import ExplorerLink from '../components/ExplorerLink'
import {
  Bolt,
  Plus,
  ArrowRight,
  Refresh,
  Shield,
  Layers,
  Clock,
  Check,
} from '../components/Icon'

type Tab = 'open' | 'quoted' | 'positions'

export default function MarketMaker() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const program = useProgram()
  const actions = useActions()

  const { data: rfqs, loading, refresh: refreshFeed } = useRfqFeed()

  // Vault balance (raw lamports from account SOL balance)
  const [vaultLamports, setVaultLamports] = useState<number | null>(null)
  const fetchVault = useCallback(() => {
    if (!publicKey) { setVaultLamports(null); return }
    connection.getBalance(mmVaultPda(publicKey)).then(setVaultLamports).catch(() => setVaultLamports(null))
  }, [publicKey, connection])
  useEffect(() => { fetchVault() }, [fetchVault])

  // All my quotes: rfqId -> offeredOddsBps
  const [myQuoteMap, setMyQuoteMap] = useState<Map<number, number>>(new Map())
  const fetchMyQuotes = useCallback(async () => {
    if (!publicKey) return
    try {
      const all = await program.account.quoteAccount.all()
      const me = publicKey.toBase58()
      const map = new Map<number, number>()
      for (const q of all) {
        if ((q.account as any).marketMaker.toBase58() === me) {
          const id = ((q.account as any).rfqId as BN).toNumber()
          map.set(id, ((q.account as any).offeredOddsBps as BN).toNumber())
        }
      }
      setMyQuoteMap(map)
    } catch { /* ignore */ }
  }, [publicKey, program])
  useEffect(() => { fetchMyQuotes() }, [fetchMyQuotes])

  // My positions as MM
  const [myPositions, setMyPositions] = useState<any[]>([])
  const fetchMyPositions = useCallback(async () => {
    if (!publicKey) return
    try {
      const all = await program.account.positionAccount.all()
      const me = publicKey.toBase58()
      setMyPositions(all.filter((p: any) => p.account.marketMaker.toBase58() === me))
    } catch { /* ignore */ }
  }, [publicKey, program])
  useEffect(() => { fetchMyPositions() }, [fetchMyPositions])

  const refresh = () => {
    refreshFeed()
    fetchVault()
    fetchMyQuotes()
    fetchMyPositions()
  }

  // Quote flow state
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [quoteOdds, setQuoteOdds] = useState('')
  const [topUp, setTopUp] = useState('1')
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('open')

  const openRfqs = useMemo(
    () => (rfqs ?? []).filter((r) => enumKey((r.account as any).status) === 'open'),
    [rfqs],
  )
  const notQuoted = useMemo(
    () => openRfqs.filter((r) => !myQuoteMap.has(((r.account as any).rfqId as BN).toNumber())),
    [openRfqs, myQuoteMap],
  )
  const alreadyQuoted = useMemo(
    () => openRfqs.filter((r) => myQuoteMap.has(((r.account as any).rfqId as BN).toNumber())),
    [openRfqs, myQuoteMap],
  )

  const displayRows = activeTab === 'open' ? notQuoted : alreadyQuoted

  const selectedRfq = selectedId != null
    ? openRfqs.find((r) => ((r.account as any).rfqId as BN).toNumber() === selectedId) ?? null
    : null
  const selectedMinOdds = selectedRfq ? ((selectedRfq.account as any).minOddsBps as BN).toNumber() : 0
  const selectedStake = selectedRfq ? ((selectedRfq.account as any).stake as BN).toNumber() : 0
  const quoteOddsBps = oddsToBps(parseFloat(quoteOdds) || 0)
  const quoteCollateral = selectedRfq ? collateralFor(selectedStake, quoteOddsBps) : 0
  const quoteValid = quoteOddsBps >= selectedMinOdds && quoteOddsBps > 0

  const wrap = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn(); refresh() } catch { /* toast shown */ } finally { setBusy(false) }
  }

  // Pre-fill odds when selecting an RFQ
  const selectRow = (id: number) => {
    setSelectedId(id)
    const rfq = openRfqs.find((r) => ((r.account as any).rfqId as BN).toNumber() === id)
    if (rfq) {
      const minBps = ((rfq.account as any).minOddsBps as BN).toNumber()
      setQuoteOdds((bpsToOdds(minBps) + 0.05).toFixed(2))
    }
  }

  if (!publicKey) return <ConnectPrompt />

  const TABS: [Tab, string, number][] = [
    ['open', 'Open to quote', notQuoted.length],
    ['quoted', 'My quotes', alreadyQuoted.length],
    ['positions', 'Positions', myPositions.length],
  ]

  return (
    <div className="animate-fade-up space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tightest">
            Market Maker
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Browse open RFQs, quote competitive odds, earn the spread.
          </p>
        </div>
        <button onClick={refresh} aria-label="Refresh" className="btn-ghost h-10 w-10 px-0">
          <Refresh size={16} />
        </button>
      </div>

      {/* Vault card */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-text-secondary">
            <Shield size={22} />
          </div>
          <div>
            <div className="label">Collateral vault</div>
            <div className="mt-0.5 font-display text-2xl font-bold tnum tracking-tight">
              {vaultLamports == null ? '—' : fmtSol(vaultLamports, 3)}
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              Quotes are free — collateral is only pulled when a bettor accepts yours.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input w-28 py-2 text-sm"
            type="number"
            step="0.1"
            min="0"
            value={topUp}
            onChange={(e) => setTopUp(e.target.value)}
            placeholder="SOL"
          />
          <button
            className="btn-accent"
            disabled={busy || !topUp}
            onClick={() => wrap(() => actions.depositCollateral(parseFloat(topUp) || 0))}
          >
            <Plus size={15} /> Deposit
          </button>
        </div>
      </div>

      {/* Two-panel layout: table + quote panel */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Left: table */}
        <div className="card min-w-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-border px-1 pt-1">
            {TABS.map(([t, label, count]) => (
              <button
                key={t}
                onClick={() => { setActiveTab(t); setSelectedId(null) }}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === t
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-2xs font-semibold ${
                    activeTab === t ? 'bg-accent/15 text-accent' : 'bg-surface-3 text-text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Table / list content */}
          {activeTab === 'positions' ? (
            <PositionsTable positions={myPositions} rfqs={rfqs ?? []} />
          ) : loading && !rfqs ? (
            <SkeletonRows />
          ) : displayRows.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="label px-4 py-2.5">Event</th>
                    <th className="label px-3 py-2.5 text-right">Stake</th>
                    <th className="label px-3 py-2.5 text-right">Min odds</th>
                    <th className="label px-3 py-2.5 text-right">Quotes</th>
                    <th className="label px-3 py-2.5 text-right">Expires</th>
                    <th className="label px-3 py-2.5 text-right">
                      {activeTab === 'quoted' ? 'Your quote' : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r) => {
                    const id = ((r.account as any).rfqId as BN).toNumber()
                    const isSelected = selectedId === id
                    const myOddsBps = myQuoteMap.get(id)
                    return (
                      <tr
                        key={r.publicKey.toBase58()}
                        onClick={() => activeTab === 'open' ? selectRow(id) : undefined}
                        className={`border-b border-border/60 transition ${
                          activeTab === 'open'
                            ? 'cursor-pointer hover:bg-surface-2/60'
                            : ''
                        } ${isSelected ? 'bg-accent/5' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="line-clamp-1 font-medium text-text-primary">
                                {(r.account as any).eventDescription}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="font-mono text-2xs text-text-muted">
                                  #{id} · {(r.account as any).matchId}
                                </span>
                                {(r.account as any).isParlay && (
                                  <span className="chip border-iris/30 bg-iris/5 text-iris py-0">
                                    <Layers size={10} /> {(r.account as any).parlayLegs.length}-leg
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono tnum text-text-primary">
                          {fmtSol((r.account as any).stake as BN)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <OddsDisplay bps={((r.account as any).minOddsBps as BN).toNumber()} />
                        </td>
                        <td className="px-3 py-3 text-right font-mono tnum text-text-secondary">
                          {(r.account as any).quoteCount}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="flex items-center justify-end gap-1 text-xs text-text-muted">
                            <Clock size={11} />
                            {timeLeft(((r.account as any).expiresAt as BN).toNumber())}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {activeTab === 'quoted' && myOddsBps != null ? (
                            <span className="flex items-center justify-end gap-1 text-xs text-accent">
                              <Check size={12} /> {fmtOdds(myOddsBps)}
                            </span>
                          ) : activeTab === 'open' ? (
                            <span className="text-xs text-text-muted">
                              {isSelected ? 'Selected' : 'Click to quote →'}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: quote panel */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
          {selectedRfq ? (
            <QuotePanel
              rfq={selectedRfq}
              quoteOdds={quoteOdds}
              setQuoteOdds={setQuoteOdds}
              quoteOddsBps={quoteOddsBps}
              quoteCollateral={quoteCollateral}
              quoteValid={quoteValid}
              vaultLamports={vaultLamports}
              busy={busy}
              onSubmit={() =>
                wrap(async () => {
                  const id = ((selectedRfq.account as any).rfqId as BN).toNumber()
                  await actions.submitQuote(id, quoteOddsBps)
                  setSelectedId(null)
                })
              }
              onCancel={() => setSelectedId(null)}
            />
          ) : (
            <div className="card flex flex-col items-center gap-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-text-muted">
                <Bolt size={20} />
              </div>
              <p className="text-sm text-text-muted">
                Select an RFQ from the table to quote odds.
              </p>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Open to quote" value={String(notQuoted.length)} />
            <MiniStat label="Quotes placed" value={String(myQuoteMap.size)} accent />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────── */

function QuotePanel({
  rfq,
  quoteOdds,
  setQuoteOdds,
  quoteOddsBps,
  quoteCollateral,
  quoteValid,
  vaultLamports,
  busy,
  onSubmit,
  onCancel,
}: {
  rfq: any
  quoteOdds: string
  setQuoteOdds: (v: string) => void
  quoteOddsBps: number
  quoteCollateral: number
  quoteValid: boolean
  vaultLamports: number | null
  busy: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  const minBps = (rfq.account.minOddsBps as BN).toNumber()
  const id = (rfq.account.rfqId as BN).toNumber()
  const enoughVault = vaultLamports != null && vaultFree(vaultLamports) >= quoteCollateral

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border bg-surface-2/40 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-display text-sm font-semibold text-text-primary line-clamp-2">
              {rfq.account.eventDescription}
            </div>
            <div className="mt-1 font-mono text-2xs text-text-muted">
              #{id} · {rfq.account.matchId}
            </div>
          </div>
          <StatusBadge status={rfq.account.status} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="label">Stake</div>
            <div className="mt-0.5 font-mono tnum font-medium">{fmtSol(rfq.account.stake as BN)}</div>
          </div>
          <div>
            <div className="label">Bettor wants ≥</div>
            <div className="mt-0.5">
              <OddsDisplay bps={minBps} showProb />
            </div>
          </div>
          <div>
            <div className="label">Expires</div>
            <div className="mt-0.5 flex items-center gap-1 text-text-secondary">
              <Clock size={11} />
              {timeLeft((rfq.account.expiresAt as BN).toNumber())}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <label className="label mb-1 block">
            Your offered odds{' '}
            <span className="text-text-muted normal-case tracking-normal">
              (min {fmtOdds(minBps)})
            </span>
          </label>
          <input
            className="input text-lg font-mono tnum"
            type="number"
            step="0.05"
            value={quoteOdds}
            onChange={(e) => setQuoteOdds(e.target.value)}
            placeholder={bpsToOdds(minBps).toFixed(2)}
          />
          {quoteOddsBps > 0 && quoteOddsBps < minBps && (
            <p className="mt-1 text-xs text-danger">
              Must be ≥ {fmtOdds(minBps)} (bettor's minimum)
            </p>
          )}
        </div>

        {/* Collateral breakdown */}
        <div className="rounded-xl border border-border bg-bg/40 px-3 py-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-text-muted">Collateral you'd lock</span>
            <span className="font-mono tnum font-semibold text-text-primary">
              {quoteOddsBps > 0 ? fmtSol(quoteCollateral) : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Your vault balance</span>
            <span className={`font-mono tnum font-medium ${
              !enoughVault && quoteOddsBps > 0 ? 'text-danger' : 'text-text-secondary'
            }`}>
              {vaultLamports == null ? '—' : fmtSol(vaultLamports)}
            </span>
          </div>
          {quoteOddsBps > 0 && (
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Potential payout if you win</span>
              <span className="font-mono tnum text-accent">
                {fmtSol((rfq.account.stake as BN).toNumber() + quoteCollateral)}
              </span>
            </div>
          )}
        </div>

        {!enoughVault && quoteOddsBps > 0 && (
          <p className="text-xs text-warning">
            Not enough collateral — deposit more to the vault above.
          </p>
        )}

        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn-accent flex-1"
            disabled={busy || !quoteValid || (vaultLamports != null && !enoughVault)}
            onClick={onSubmit}
          >
            <ArrowRight size={15} />
            {busy
              ? 'Submitting…'
              : vaultLamports != null && !enoughVault
                ? 'Top up vault first'
                : 'Submit quote'}
          </button>
        </div>

        <Link
          to={`/rfq/${id}`}
          className="block text-center text-xs text-text-muted hover:text-accent transition"
        >
          View full RFQ detail →
        </Link>
      </div>
    </div>
  )
}

function PositionsTable({ positions, rfqs }: { positions: any[]; rfqs: any[] }) {
  if (positions.length === 0)
    return <EmptyState tab="positions" />

  const rfqMap = new Map(rfqs.map((r) => [((r.account as any).rfqId as BN).toNumber(), r]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="label px-4 py-2.5">Event</th>
            <th className="label px-3 py-2.5 text-right">Matched odds</th>
            <th className="label px-3 py-2.5 text-right">Payout</th>
            <th className="label px-3 py-2.5 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const id = (p.account.rfqId as BN).toNumber()
            const rfq = rfqMap.get(id)
            return (
              <tr key={p.publicKey.toBase58()} className="border-b border-border/60">
                <td className="px-4 py-3">
                  <Link
                    to={`/rfq/${id}`}
                    className="font-medium text-text-primary hover:text-accent transition line-clamp-1"
                  >
                    {rfq?.account.eventDescription ?? `RFQ #${id}`}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-2xs text-text-muted">#{id}</span>
                    <ExplorerLink
                      address={p.publicKey}
                      label="On-chain"
                      title="View this position account on Solana Explorer"
                    />
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <OddsDisplay bps={(p.account.matchedOddsBps as BN).toNumber()} />
                </td>
                <td className="px-3 py-3 text-right font-mono tnum text-text-primary">
                  {fmtSol(p.account.payoutAmount as BN)}
                </td>
                <td className="px-3 py-3 text-right">
                  <StatusBadge status={p.account.status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ConnectPrompt() {
  return (
    <div className="animate-fade-up card flex flex-col items-center gap-4 p-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-2 text-text-muted">
        <Shield size={26} />
      </div>
      <div>
        <p className="font-display text-lg font-semibold">Connect your wallet</p>
        <p className="mt-1 text-sm text-text-muted">
          Connect to browse open RFQs and start quoting markets.
        </p>
      </div>
      <WalletMultiButton />
    </div>
  )
}

function EmptyState({ tab }: { tab: Tab }) {
  const msgs: Record<Tab, string> = {
    open: 'No unquoted open markets right now.',
    quoted: "You haven't submitted any quotes yet.",
    positions: "No MM positions yet — accept a quote to get started.",
  }
  return (
    <div className="p-10 text-center text-sm text-text-muted">{msgs[tab]}</div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-px p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton ml-auto h-4 w-16" />
          <div className="skeleton h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <div className="label">{label}</div>
      <div className={`mt-0.5 font-display text-2xl font-bold tnum ${accent ? 'text-accent' : ''}`}>
        {value}
      </div>
    </div>
  )
}
