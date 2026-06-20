import { Link } from 'react-router-dom'
import { shortAddr } from '../lib/format'
import { CheckCircle, AlertTriangle } from './Icon'

export default function ReputationBadge({
  wallet,
  markets,
  link = true,
}: {
  wallet: string
  markets?: number
  link?: boolean
}) {
  const clean = (markets ?? 0) > 0
  const inner = (
    <>
      <span className="font-mono text-xs">{shortAddr(wallet)}</span>
      {markets != null && (
        <span className="text-xs text-text-muted">· {markets} mkts</span>
      )}
      {markets != null &&
        (clean ? (
          <span title="settled cleanly" className="text-accent">
            <CheckCircle size={13} />
          </span>
        ) : (
          <span title="new market maker" className="text-warning">
            <AlertTriangle size={13} />
          </span>
        ))}
    </>
  )
  return link ? (
    <Link
      to={`/reputation/${wallet}`}
      className="inline-flex items-center gap-1.5 hover:text-accent"
    >
      {inner}
    </Link>
  ) : (
    <span className="inline-flex items-center gap-1.5">{inner}</span>
  )
}
