import { statusInfo } from '../lib/status'

export default function StatusBadge({ status }: { status: unknown }) {
  const s = statusInfo(status)
  return (
    <span className={`chip whitespace-nowrap ${s.color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
      {s.label}
    </span>
  )
}
