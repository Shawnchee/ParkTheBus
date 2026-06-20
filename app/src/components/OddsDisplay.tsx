import { fmtOdds, impliedProb, fmtPct } from '../lib/format'

export default function OddsDisplay({
  bps,
  live,
  showProb,
  className = '',
}: {
  bps: number
  live?: boolean
  showProb?: boolean
  className?: string
}) {
  return (
    <span className={`odds ${live ? 'odds-live' : ''} ${className}`}>
      {fmtOdds(bps)}
      {showProb && (
        <span className="ml-1 text-xs font-normal tnum text-text-muted">
          ({fmtPct(impliedProb(bps))})
        </span>
      )}
    </span>
  )
}
