import { useEffect, useState, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PublicKey } from '@solana/web3.js'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import BN from 'bn.js'
import { useRfq, useQuotes, usePosition } from '../hooks/useData'
import { useActions } from '../hooks/useActions'
import { enumKey } from '../lib/anchor'
import { mmVaultPda } from '../lib/pdas'
import { isCouncil } from '../config'
import { fmtSol, oddsToBps, collateralFor, timeLeft, shortAddr, vaultFree } from '../lib/format'
import { aiMmAssistant } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import OddsDisplay from '../components/OddsDisplay'
import QuoteList from '../components/QuoteList'
import AIAdvisor from '../components/AIAdvisor'
import ContractSummaryModal from '../components/ContractSummaryModal'
import { ArrowLeft, ArrowRight, Layers } from '../components/Icon'

export default function RFQDetail() {
  const { id } = useParams()
  const rfqId = id != null ? Number(id) : null
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { data: rfq, refresh: refreshRfq } = useRfq(rfqId)
  const { data: quotes, refresh: refreshQuotes } = useQuotes(rfqId)
  const { data: position, refresh: refreshPos } = usePosition(rfqId)
  const actions = useActions()

  const [mmOdds, setMmOdds] = useState('2.3')
  const [topUp, setTopUp] = useState('1')
  const [busy, setBusy] = useState(false)
  const [accept, setAccept] = useState<{ mm: string; oddsBps: number } | null>(null)
  const [vaultLamports, setVaultLamports] = useState<number | null>(null)
  // mm base58 -> free vault lamports, so we can flag unbacked quotes before accept.
  const [quoteVaultFree, setQuoteVaultFree] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!publicKey) return setVaultLamports(null)
    connection
      .getBalance(mmVaultPda(publicKey))
      .then(setVaultLamports)
      .catch(() => setVaultLamports(null))
  }, [publicKey, connection, busy])

  useEffect(() => {
    if (!quotes || quotes.length === 0) return setQuoteVaultFree({})
    let cancelled = false
    const mms = quotes.map((q) => q.account.marketMaker)
    Promise.all(mms.map((mm) => connection.getBalance(mmVaultPda(mm)).catch(() => 0))).then(
      (bals) => {
        if (cancelled) return
        const map: Record<string, number> = {}
        mms.forEach((mm, i) => (map[mm.toBase58()] = vaultFree(bals[i])))
        setQuoteVaultFree(map)
      },
    )
    return () => {
      cancelled = true
    }
  }, [quotes, connection, busy])

  if (rfqId == null) return <div className="card p-8 text-center">Invalid RFQ id.</div>
  if (!rfq)
    return (
      <div className="card p-10 text-center text-text-muted">Loading RFQ #{rfqId}…</div>
    )

  const status = enumKey(rfq.status)
  const isOpen = status === 'open'
  const isBettor = !!publicKey && rfq.bettor.equals(publicKey)
  const stake = (rfq.stake as BN).toNumber()
  const minOdds = (rfq.minOddsBps as BN).toNumber()
  const custom = enumKey(rfq.eventType) === 'custom'
  const pendingApproval = status === 'pendingApproval'
  const council = isCouncil(publicKey)

  const mmOddsBps = oddsToBps(parseFloat(mmOdds) || 0)
  const mmCollateral = collateralFor(stake, mmOddsBps)
  const selfVaultFree = vaultLamports == null ? null : vaultFree(vaultLamports)
  // Block submitting a quote we can't actually back — accept_quote would revert (err 6016).
  const mmUnderfunded = selfVaultFree != null && mmCollateral > selfVaultFree
  const refresh = () => {
    refreshRfq()
    refreshQuotes()
    refreshPos()
  }
  const wrap = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      refresh()
    } catch {
      /* toast shown */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-text-muted transition hover:text-accent">
        <ArrowLeft size={15} /> Back to feed
      </Link>

      {/* header */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{rfq.eventDescription}</h1>
              {rfq.isParlay && (
                <span className="chip border-iris/30 bg-iris/5 text-iris">
                  <Layers size={12} /> Parlay
                </span>
              )}
              {custom && <span className="chip border-warning/30 bg-warning/5 text-warning">Custom</span>}
            </div>
            <div className="mt-1 font-mono text-xs text-text-muted">
              RFQ #{rfqId} · {rfq.matchId} · by {shortAddr(rfq.bettor.toBase58())}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={rfq.status} />
            <StatusBadge status={rfq.approvalStatus} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Stake" value={fmtSol(rfq.stake as BN)} />
          <Stat label="Wants ≥" node={<OddsDisplay bps={minOdds} live showProb />} />
          <Stat label="Quotes" value={String(rfq.quoteCount)} />
          <Stat label="Expires" value={timeLeft((rfq.expiresAt as BN).toNumber())} />
        </div>

        {rfq.isParlay && (
          <div className="mt-4">
            <div className="label mb-1">Legs — all must hit</div>
            <div className="space-y-1">
              {rfq.parlayLegs.map((leg, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-sm"
                >
                  <span>
                    {i + 1}. {leg.eventDescription}
                  </span>
                  <StatusBadge status={leg.result} />
                </div>
              ))}
            </div>
          </div>
        )}

        {isBettor && isOpen && (
          <button
            className="btn-danger mt-4 text-sm"
            disabled={busy}
            onClick={() => wrap(() => actions.cancelRfq(rfqId))}
          >
            Cancel RFQ (refund deposit)
          </button>
        )}
      </div>

      {/* council approval */}
      {custom && pendingApproval && council && (
        <div className="card border-warning/30 p-5">
          <div className="label mb-2">Council review — is this objectively verifiable?</div>
          <div className="flex gap-2">
            <button
              className="btn-accent"
              disabled={busy}
              onClick={() => wrap(() => actions.approveMarket(rfqId, true))}
            >
              Approve
            </button>
            <button
              className="btn-danger"
              disabled={busy}
              onClick={() => wrap(() => actions.approveMarket(rfqId, false))}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* matched / settled */}
      {position && (
        <div className="card border-sky/30 p-5">
          <div className="flex items-center justify-between">
            <div className="label">Position</div>
            <StatusBadge status={position.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Matched odds" node={<OddsDisplay bps={(position.matchedOddsBps as BN).toNumber()} />} />
            <Stat label="Payout" value={fmtSol(position.payoutAmount as BN)} />
            <Stat label="MM collateral" value={fmtSol(position.collateral as BN)} />
            <Stat label="MM" value={shortAddr(position.marketMaker.toBase58())} />
          </div>
          <Link to="/portfolio" className="btn-ghost mt-4 inline-flex text-sm">
            View in portfolio <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* quotes */}
      <div>
        <h2 className="mb-3 font-display text-lg font-bold">
          Ranked quotes {quotes ? `(${quotes.length})` : ''}
        </h2>
        <QuoteList
          quotes={quotes ?? []}
          canAccept={isBettor && isOpen}
          accepting={busy}
          vaultFree={quoteVaultFree}
          onAccept={(mm, oddsBps) => setAccept({ mm, oddsBps })}
        />
      </div>

      {/* MM panel */}
      {isOpen && !isBettor && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="card space-y-4 p-5">
            <div className="label">Market maker — submit a quote</div>

            <div className="rounded-lg border border-border bg-surface/50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Your collateral vault</span>
                <span className="font-mono">
                  {vaultLamports == null ? '—' : fmtSol(vaultLamports)}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  value={topUp}
                  onChange={(e) => setTopUp(e.target.value)}
                />
                <button
                  className="btn-ghost shrink-0"
                  disabled={busy || !publicKey}
                  onClick={() => wrap(() => actions.depositCollateral(parseFloat(topUp) || 0))}
                >
                  Top up
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Quotes are free; collateral is only pulled when a bettor accepts yours.
              </p>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="label">Your offered odds (≥ {(minOdds / 10000).toFixed(2)}x)</label>
                <input
                  className="input mt-1"
                  type="number"
                  step="0.1"
                  value={mmOdds}
                  onChange={(e) => setMmOdds(e.target.value)}
                />
              </div>
              <div className="text-right text-sm">
                <div className="label">You'd lock</div>
                <div className={`font-mono ${mmUnderfunded ? 'text-danger' : ''}`}>
                  {fmtSol(mmCollateral)}
                </div>
              </div>
            </div>
            {mmUnderfunded && (
              <p className="text-xs text-warning">
                You'd lock {fmtSol(mmCollateral)} but only {fmtSol(selfVaultFree ?? 0)} is free in
                your vault. Top up first — otherwise the bettor can't accept this quote.
              </p>
            )}
            <button
              className="btn-accent w-full"
              disabled={busy || mmOddsBps < minOdds || mmUnderfunded}
              onClick={() => wrap(() => actions.submitQuote(rfqId, mmOddsBps))}
            >
              {mmOddsBps < minOdds
                ? 'Below bettor minimum'
                : mmUnderfunded
                  ? 'Top up vault to cover collateral'
                  : 'Submit quote'}
            </button>
          </div>

          <AIAdvisor
            title="MM Quote Assistant"
            fetcher={() =>
              aiMmAssistant({
                eventDescription: rfq.eventDescription,
                minOddsBps: minOdds,
                offeredOddsBps: mmOddsBps,
              })
            }
            deps={[mmOddsBps, minOdds]}
          />
        </div>
      )}

      <ContractSummaryModal
        open={!!accept}
        busy={busy}
        onClose={() => setAccept(null)}
        onConfirm={() =>
          accept &&
          wrap(async () => {
            await actions.acceptQuote(rfqId, new PublicKey(accept.mm))
            setAccept(null)
          })
        }
        params={{
          eventDescription: rfq.eventDescription,
          stakeLamports: stake,
          oddsBps: accept?.oddsBps ?? minOdds,
          marketMaker: shortAddr(accept?.mm ?? ''),
        }}
      />
    </div>
  )
}

function Stat({ label, value, node }: { label: string; value?: string; node?: ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="font-mono text-sm">{node ?? value}</div>
    </div>
  )
}
