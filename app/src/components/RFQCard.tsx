import { Link } from 'react-router-dom'
import BN from 'bn.js'
import type { WithKey } from '../hooks/useData'
import { type RfqAccount, enumKey } from '../lib/anchor'
import { fmtSol, timeLeft } from '../lib/format'
import StatusBadge from './StatusBadge'
import OddsDisplay from './OddsDisplay'
import { Clock, Layers, ArrowRight } from './Icon'

export default function RFQCard({ item }: { item: WithKey<RfqAccount> }) {
  const r = item.account
  const id = (r.rfqId as BN).toNumber()
  const custom = enumKey(r.eventType) === 'custom'
  return (
    <Link
      to={`/rfq/${id}`}
      className="card card-hover group relative block overflow-hidden p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display text-[15px] font-semibold leading-tight text-text-primary">
              {r.eventDescription}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {r.isParlay && (
              <span className="chip border-iris/30 bg-iris/5 text-iris">
                <Layers size={11} /> {r.parlayLegs.length}-leg
              </span>
            )}
            {custom && (
              <span className="chip border-warning/30 bg-warning/5 text-warning">Custom</span>
            )}
            <span className="font-mono text-2xs text-text-muted tnum">
              #{id} · {r.matchId}
            </span>
          </div>
        </div>
        <StatusBadge status={r.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-bg/40 p-3 text-sm">
        <div>
          <div className="label">Stake</div>
          <div className="mt-0.5 font-mono font-medium tnum text-text-primary">{fmtSol(r.stake as BN)}</div>
        </div>
        <div className="border-x border-border/60 px-2">
          <div className="label">Wants ≥</div>
          <div className="mt-0.5">
            <OddsDisplay bps={(r.minOddsBps as BN).toNumber()} live />
          </div>
        </div>
        <div className="text-right">
          <div className="label">Quotes</div>
          <div className="mt-0.5 font-mono font-medium tnum text-text-primary">{r.quoteCount}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <Clock size={13} /> {timeLeft((r.expiresAt as BN).toNumber())}
        </span>
        <span className="flex items-center gap-1 text-text-secondary transition group-hover:gap-1.5 group-hover:text-accent">
          View <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  )
}
