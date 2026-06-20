import type { PublicKey } from '@solana/web3.js'
import { explorerAddr, explorerTx } from '../config'
import { ExternalLink } from './Icon'

/**
 * A small "view on Solana Explorer" pill button.
 *
 * Pass `tx` for a confirmed transaction signature, or `address` for an
 * on-chain account (RFQ / quote / position / vault PDA). For historical
 * records we only have the account — its Explorer page lists the full
 * transaction history, which is the persistent equivalent of the tx link
 * shown in the success toast.
 */
export default function ExplorerLink({
  address,
  tx,
  label = 'Explorer',
  title,
  size = 11,
  className = '',
  /** Stop click propagation — use when nested inside a clickable card/row. */
  stop = false,
}: {
  address?: PublicKey | string
  tx?: string
  label?: string
  title?: string
  size?: number
  className?: string
  stop?: boolean
}) {
  const addr = typeof address === 'string' ? address : address?.toBase58()
  const href = tx ? explorerTx(tx) : addr ? explorerAddr(addr) : null
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={stop ? (e) => e.stopPropagation() : undefined}
      title={
        title ??
        (tx ? 'View transaction on Solana Explorer' : 'View account on Solana Explorer')
      }
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border border-border/70 px-1.5 py-0.5 text-2xs font-medium text-text-muted transition hover:border-accent/40 hover:text-accent ${className}`}
    >
      <ExternalLink size={size} />
      {label}
    </a>
  )
}
