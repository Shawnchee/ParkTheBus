import { enumKey } from './anchor'

const ACCENT = 'border-accent/30 bg-accent/5 text-accent'
const WARN = 'border-warning/30 bg-warning/5 text-warning'
const INFO = 'border-sky/30 bg-sky/5 text-sky'
const MUTED = 'border-border bg-surface-2/50 text-text-muted'
const DANGER = 'border-danger/30 bg-danger/5 text-danger'

const COLORS: Record<string, string> = {
  open: ACCENT,
  pendingApproval: WARN,
  matched: INFO,
  settled: MUTED,
  settledBettorWin: ACCENT,
  settledMmWin: WARN,
  cancelled: MUTED,
  expired: MUTED,
  accepted: ACCENT,
  pending: WARN,
  rejected: DANGER,
  autoApproved: ACCENT,
  councilApproved: ACCENT,
  won: ACCENT,
  lost: DANGER,
}

const LABELS: Record<string, string> = {
  pendingApproval: 'Pending council',
  open: 'Open',
  matched: 'Matched',
  settled: 'Settled',
  expired: 'Expired',
  cancelled: 'Cancelled',
  settledBettorWin: 'Bettor won',
  settledMmWin: 'MM won',
  accepted: 'Accepted',
  pending: 'Pending',
  rejected: 'Rejected',
  autoApproved: 'Auto-approved',
  councilApproved: 'Council approved',
  won: 'Won',
  lost: 'Lost',
}

export interface StatusInfo {
  key: string
  label: string
  color: string
}

export function statusInfo(e: unknown): StatusInfo {
  const key = enumKey(e as Record<string, unknown>)
  return { key, label: LABELS[key] ?? key, color: COLORS[key] ?? MUTED }
}
