import { useParams } from 'react-router-dom'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { useReputation } from '../hooks/useData'
import { explorerAddr } from '../config'
import { fmtSol, shortAddr } from '../lib/format'
import { CheckCircle, ExternalLink, Shield } from '../components/Icon'

export default function Reputation() {
  const { wallet } = useParams()
  let pk: PublicKey | null = null
  try {
    pk = wallet ? new PublicKey(wallet) : null
  } catch {
    pk = null
  }
  const { data: rep, loading } = useReputation(pk)

  if (!pk) return <div className="card p-8 text-center">Invalid wallet address.</div>

  const wins = rep ? (rep.mmWins as BN).toNumber() : 0
  const losses = rep ? (rep.mmLosses as BN).toNumber() : 0
  const disputes = rep ? (rep.disputesInvolved as BN).toNumber() : 0
  const settled = wins + losses
  const clean = settled > 0 && disputes === 0

  return (
    <div className="animate-fade-up space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Reputation</h1>
            <a
              href={explorerAddr(pk.toBase58())}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-sm text-text-muted transition hover:text-accent"
            >
              {shortAddr(pk.toBase58(), 6)} <ExternalLink size={13} />
            </a>
          </div>
          <div className="flex gap-2">
            {rep?.isCouncilMember && (
              <span className="chip border-iris/30 bg-iris/5 text-iris">
                <Shield size={12} /> Council
              </span>
            )}
            {settled > 0 &&
              (clean ? (
                <span className="chip border-accent/30 bg-accent/5 text-accent">
                  <CheckCircle size={12} /> clean
                </span>
              ) : (
                <span className="chip border-warning/30 bg-warning/5 text-warning">disputes</span>
              ))}
          </div>
        </div>
      </div>

      {loading && !rep ? (
        <div className="card p-6 text-center text-text-muted">Loading…</div>
      ) : !rep ? (
        <div className="card p-8 text-center text-text-muted">
          No on-chain reputation yet — this wallet hasn't settled a market.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Markets as MM" value={String((rep.marketsAsMm as BN).toNumber())} />
          <Stat label="Markets as bettor" value={String((rep.marketsAsBettor as BN).toNumber())} />
          <Stat label="Total volume" value={fmtSol(rep.totalVolumeLamports as BN)} />
          <Stat label="MM wins" value={String(wins)} accent />
          <Stat label="MM losses" value={String(losses)} />
          <Stat label="Disputes" value={String((rep.disputesInvolved as BN).toNumber())} />
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tnum ${accent ? 'text-accent' : ''}`}>
        {value}
      </div>
    </div>
  )
}
