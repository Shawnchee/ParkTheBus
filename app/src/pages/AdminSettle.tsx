/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { useProgram, enumKey } from '../lib/anchor'
import { useActions, type OutcomeArg } from '../hooks/useActions'
import { configPda } from '../lib/pdas'
import { isCouncil } from '../config'
import { fmtSol, shortAddr } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import { Lock, AlertTriangle, Shield, ArrowRight } from '../components/Icon'

export default function AdminSettle() {
  const { publicKey } = useWallet()
  const program = useProgram()
  const actions = useActions()
  const [rfqs, setRfqs] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [settlements, setSettlements] = useState<any[]>([])
  const [threshold, setThreshold] = useState(2)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      program.account.rfqAccount.all(),
      program.account.positionAccount.all(),
      program.account.settlementAccount.all(),
      program.account.config.fetchNullable(configPda()),
    ])
      .then(([r, p, s, cfg]: any[]) => {
        setRfqs(r)
        setPositions(p)
        setSettlements(s)
        if (cfg) setThreshold(cfg.threshold)
      })
      .catch(() => {})
  }, [program])

  useEffect(() => {
    load()
  }, [load])

  const wrap = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      load()
    } catch {
      /* toast shown */
    } finally {
      setBusy(false)
    }
  }

  if (!isCouncil(publicKey))
    return (
      <div className="card flex flex-col items-center gap-4 p-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-2 text-text-muted">
          <Lock size={24} />
        </div>
        <p className="max-w-sm text-text-muted">
          Council only. Connect with a registered council wallet to settle markets.
        </p>
        <WalletMultiButton />
      </div>
    )

  const pendingApprovals = rfqs.filter(
    (r) => enumKey(r.account.status) === 'pendingApproval',
  )
  const rfqById = (id: number) =>
    rfqs.find((r) => (r.account.rfqId as BN).toNumber() === id)
  const settlementFor = (id: number) =>
    settlements.find((s) => (s.account.rfqId as BN).toNumber() === id)
  const open = positions.filter((p) => enumKey(p.account.status) === 'matched')

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Council Settlement</h1>
        <span className="chip border-iris/30 bg-iris/5 text-iris">
          <Shield size={12} /> {threshold}-of-{threshold}
        </span>
      </div>

      {/* approvals */}
      {pendingApprovals.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">Custom markets awaiting approval</h2>
          <div className="space-y-2">
            {pendingApprovals.map((r) => {
              const id = (r.account.rfqId as BN).toNumber()
              return (
                <div key={r.publicKey.toBase58()} className="card flex items-center justify-between gap-3 p-4">
                  <div>
                    <span className="font-mono text-xs text-text-muted">#{id}</span>{' '}
                    {r.account.eventDescription}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-accent text-sm" disabled={busy} onClick={() => wrap(() => actions.approveMarket(id, true))}>
                      Approve
                    </button>
                    <button className="btn-danger text-sm" disabled={busy} onClick={() => wrap(() => actions.approveMarket(id, false))}>
                      Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* settlements */}
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Matched markets to settle ({open.length})</h2>
        {open.length === 0 ? (
          <div className="card p-6 text-center text-sm text-text-muted">
            Nothing matched is awaiting settlement.
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((p) => {
              const id = (p.account.rfqId as BN).toNumber()
              const rfq = rfqById(id)
              const s = settlementFor(id)
              const votes = s ? s.account.voteCount : 0
              const proposed = s ? enumKey(s.account.outcome) : null
              const ready = votes >= threshold && !(s?.account.executed)
              const bettor = p.account.bettor as PublicKey
              const mm = p.account.marketMaker as PublicKey
              const excluded =
                publicKey && (bettor.equals(publicKey) || mm.equals(publicKey))

              return (
                <div key={p.publicKey.toBase58()} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to={`/rfq/${id}`} className="font-display font-semibold hover:text-accent">
                        {rfq?.account.eventDescription ?? `RFQ #${id}`}
                      </Link>
                      <div className="mt-1 font-mono text-xs text-text-muted">
                        #{id} · {fmtSol(p.account.payoutAmount as BN)} pot · bettor {shortAddr(bettor.toBase58())} · mm {shortAddr(mm.toBase58())}
                      </div>
                    </div>
                    <span className="chip border-border text-text-muted">
                      votes {votes}/{threshold}
                      {proposed ? ` · ${proposed}` : ''}
                    </span>
                  </div>

                  {/* parlay legs */}
                  {rfq?.account.isParlay && (
                    <div className="mt-3 space-y-1">
                      <div className="label">Record legs</div>
                      {rfq.account.parlayLegs.map((leg: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                          <span>{i + 1}. {leg.eventDescription}</span>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={leg.result} />
                            <button className="btn-ghost px-2 py-1 text-xs" disabled={busy} onClick={() => wrap(() => actions.recordLegResult(id, i, true))}>Won</button>
                            <button className="btn-ghost px-2 py-1 text-xs" disabled={busy} onClick={() => wrap(() => actions.recordLegResult(id, i, false))}>Lost</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {excluded ? (
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-warning">
                      <AlertTriangle size={14} /> You're a party to this market — excluded from
                      voting (Rule 2).
                    </p>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(
                        [
                          ['bettorWins', 'Vote: Bettor wins'],
                          ['mmWins', 'Vote: MM wins'],
                          ['void', 'Vote: Void / refund'],
                        ] as [OutcomeArg, string][]
                      ).map(([o, label]) => (
                        <button
                          key={o}
                          className="btn-ghost text-sm"
                          disabled={busy}
                          onClick={() => wrap(() => actions.signSettlement(id, o, 'api-football'))}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    className="btn-accent mt-3 w-full"
                    disabled={busy || !ready}
                    onClick={() => wrap(() => actions.executeSettlement(id, bettor, mm))}
                  >
                    {ready ? (
                      <>
                        Execute settlement <ArrowRight size={15} /> release escrow
                      </>
                    ) : (
                      `Needs ${threshold} agreeing votes`
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
