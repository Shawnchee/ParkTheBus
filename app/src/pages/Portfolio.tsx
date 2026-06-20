/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import BN from 'bn.js'
import { useProgram, enumKey } from '../lib/anchor'
import { fmtSol } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import OddsDisplay from '../components/OddsDisplay'

export default function Portfolio() {
  const { publicKey } = useWallet()
  const program = useProgram()
  const [rfqs, setRfqs] = useState<any[]>([])
  const [quotes, setQuotes] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!publicKey) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all([
      program.account.rfqAccount.all(),
      program.account.quoteAccount.all(),
      program.account.positionAccount.all(),
    ])
      .then(([r, q, p]) => {
        if (cancelled) return
        const me = publicKey.toBase58()
        setRfqs(r.filter((x: any) => x.account.bettor.toBase58() === me))
        setQuotes(q.filter((x: any) => x.account.marketMaker.toBase58() === me))
        setPositions(
          p.filter(
            (x: any) =>
              x.account.bettor.toBase58() === me ||
              x.account.marketMaker.toBase58() === me,
          ),
        )
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, publicKey?.toBase58()])

  if (!publicKey)
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-text-muted">Connect your wallet to view your portfolio.</p>
        <WalletMultiButton />
      </div>
    )

  const me = publicKey.toBase58()
  const matched = positions.filter((p) => enumKey(p.account.status) === 'matched')
  const escrow = matched.reduce((s, p) => s + (p.account.payoutAmount as BN).toNumber(), 0)
  const settled = positions.filter((p) => enumKey(p.account.status) !== 'matched')

  return (
    <div className="animate-fade-up space-y-6">
      <h1 className="font-display text-2xl font-bold">My Portfolio</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Active positions" value={String(matched.length)} />
        <Card label="In escrow" value={fmtSol(escrow)} />
        <Card label="Open RFQs" value={String(rfqs.filter((r) => enumKey(r.account.status) === 'open' || enumKey(r.account.status) === 'pendingApproval').length)} />
        <Card label="Settled" value={String(settled.length)} />
      </div>

      {loading && <div className="card p-6 text-center text-text-muted">Loading…</div>}

      <Section title={`Positions (${positions.length})`}>
        {positions.length === 0 ? (
          <Empty>No positions yet.</Empty>
        ) : (
          positions.map((p) => {
            const id = (p.account.rfqId as BN).toNumber()
            const role = p.account.bettor.toBase58() === me ? 'Bettor' : 'Market maker'
            return (
              <Row key={p.publicKey.toBase58()} to={`/rfq/${id}`}>
                <div>
                  <span className="font-mono text-xs text-text-muted">#{id}</span>{' '}
                  <span className="chip border-border text-text-muted">{role}</span>
                </div>
                <div className="flex items-center gap-3">
                  <OddsDisplay bps={(p.account.matchedOddsBps as BN).toNumber()} />
                  <span className="font-mono text-sm">{fmtSol(p.account.payoutAmount as BN)}</span>
                  <StatusBadge status={p.account.status} />
                </div>
              </Row>
            )
          })
        )}
      </Section>

      <Section title={`My RFQs (${rfqs.length})`}>
        {rfqs.length === 0 ? (
          <Empty>You haven't posted any RFQs.</Empty>
        ) : (
          rfqs.map((r) => {
            const id = (r.account.rfqId as BN).toNumber()
            return (
              <Row key={r.publicKey.toBase58()} to={`/rfq/${id}`}>
                <span>
                  <span className="font-mono text-xs text-text-muted">#{id}</span>{' '}
                  {r.account.eventDescription}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">{fmtSol(r.account.stake as BN)}</span>
                  <StatusBadge status={r.account.status} />
                </div>
              </Row>
            )
          })
        )}
      </Section>

      <Section title={`My quotes (${quotes.length})`}>
        {quotes.length === 0 ? (
          <Empty>No quotes submitted.</Empty>
        ) : (
          quotes.map((q) => {
            const id = (q.account.rfqId as BN).toNumber()
            return (
              <Row key={q.publicKey.toBase58()} to={`/rfq/${id}`}>
                <span className="font-mono text-xs text-text-muted">RFQ #{id}</span>
                <div className="flex items-center gap-3">
                  <OddsDisplay bps={(q.account.offeredOddsBps as BN).toNumber()} />
                  <StatusBadge status={q.account.status} />
                </div>
              </Row>
            )
          })
        )}
      </Section>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  )
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 font-display text-lg font-bold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
function Row({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="card flex items-center justify-between gap-3 p-3 text-sm transition hover:border-accent/40"
    >
      {children}
    </Link>
  )
}
function Empty({ children }: { children: ReactNode }) {
  return <div className="card p-5 text-center text-sm text-text-muted">{children}</div>
}
