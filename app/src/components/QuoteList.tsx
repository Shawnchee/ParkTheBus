import BN from 'bn.js'
import type { WithKey } from '../hooks/useData'
import type { QuoteAccount } from '../lib/anchor'
import { fmtSol } from '../lib/format'
import OddsDisplay from './OddsDisplay'
import ReputationBadge from './ReputationBadge'
import ExplorerLink from './ExplorerLink'

export default function QuoteList({
  quotes,
  onAccept,
  canAccept,
  accepting,
  vaultFree,
}: {
  quotes: WithKey<QuoteAccount>[]
  onAccept?: (mm: string, oddsBps: number) => void
  canAccept?: boolean
  accepting?: boolean
  /** mm base58 -> rent-adjusted free lamports in that MM's vault. undefined while loading. */
  vaultFree?: Record<string, number>
}) {
  // Best quote for the bettor = highest odds.
  const ranked = [...quotes].sort(
    (a, b) =>
      (b.account.offeredOddsBps as BN).toNumber() - (a.account.offeredOddsBps as BN).toNumber(),
  )

  if (ranked.length === 0)
    return (
      <div className="card p-6 text-center text-sm text-text-muted">
        No quotes yet — be the first market maker.
      </div>
    )

  return (
    <div className="space-y-2">
      {ranked.map((q, i) => {
        const mm = q.account.marketMaker.toBase58()
        const odds = (q.account.offeredOddsBps as BN).toNumber()
        const required = (q.account.collateralRequired as BN).toNumber()
        const free = vaultFree?.[mm]
        // undefined while balances load; true/false once we know.
        const backed = free == null ? undefined : free >= required
        return (
          <div
            key={mm}
            className={`card flex items-center justify-between gap-3 p-3 ${
              backed === false ? 'opacity-70' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`font-mono text-sm ${
                  i === 0 && backed !== false ? 'text-accent' : 'text-text-muted'
                }`}
              >
                #{i + 1}
              </span>
              <div className="flex flex-col items-start gap-1">
                <ReputationBadge wallet={mm} />
                <ExplorerLink
                  address={q.publicKey}
                  label="Quote on-chain"
                  title="View this quote account on Solana Explorer"
                />
                {backed === false && (
                  <span className="chip border-danger/30 bg-danger/5 text-danger">
                    Unbacked · vault {fmtSol(free ?? 0)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <OddsDisplay bps={odds} showProb />
                <div className="label">collateral {fmtSol(required)}</div>
              </div>
              {canAccept && onAccept && (
                <button
                  className="btn-accent text-sm"
                  disabled={accepting || backed === false}
                  title={
                    backed === false
                      ? "This market maker hasn't locked enough collateral to back the quote."
                      : undefined
                  }
                  onClick={() => onAccept(mm, odds)}
                >
                  {backed === false ? 'Unbacked' : 'Accept'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
