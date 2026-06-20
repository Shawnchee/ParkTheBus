import { useEffect, useState } from 'react'
import { aiContractSummary, type Advice } from '../lib/api'
import { Sparkle, Shield } from './Icon'

export interface SummaryParams {
  eventDescription: string
  stakeLamports: number
  oddsBps: number
  marketMaker: string
  mmMarkets?: number
}

export default function ContractSummaryModal({
  open,
  onClose,
  onConfirm,
  busy,
  params,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  busy?: boolean
  params: SummaryParams
}) {
  const [advice, setAdvice] = useState<Advice | null>(null)

  useEffect(() => {
    if (!open) return
    setAdvice(null)
    aiContractSummary(params)
      .then(setAdvice)
      .catch(() => setAdvice(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card w-full max-w-md animate-fade-up p-6 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
            <Shield size={18} />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight">Confirm your bet</h3>
            <p className="text-xs text-text-muted">Plain-English summary before you sign on-chain</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-iris/20 bg-surface-2/60 p-4 text-sm leading-relaxed text-text-secondary">
          <div className="mb-2 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.12em] text-iris">
            <Sparkle size={12} /> AI summary
          </div>
          {advice ? (
            advice.text
          ) : (
            <div className="space-y-2">
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-4/5" />
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-accent flex-1" onClick={onConfirm} disabled={busy}>
            {busy ? 'Signing…' : 'Sign & accept'}
          </button>
        </div>
      </div>
    </div>
  )
}
