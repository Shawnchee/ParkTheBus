import { useState } from 'react'
import type { Advice } from '../lib/api'
import { Sparkle } from './Icon'

export default function AIAdvisor({
  title,
  fetcher,
  enabled = true,
  placeholder = 'Fill in the fields to get AI guidance.',
}: {
  title: string
  fetcher: () => Promise<Advice>
  enabled?: boolean
  placeholder?: string
  deps: unknown[]
}) {
  const [advice, setAdvice] = useState<Advice | null>(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!enabled || loading) return
    setLoading(true)
    try {
      const a = await fetcher()
      setAdvice(a)
    } catch {
      setAdvice(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-iris/20 bg-surface shadow-card">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-iris/15 text-iris">
              <Sparkle size={13} />
            </span>
            <span className="font-display text-sm font-semibold text-text-primary">{title}</span>
          </span>
          {advice && (
            <span
              className={`chip text-2xs ${
                advice.ai
                  ? 'border-iris/30 bg-iris/10 text-iris'
                  : 'border-border text-text-muted'
              }`}
            >
              {advice.ai ? 'Claude' : 'estimate'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-5/6" />
            <div className="skeleton h-3 w-3/5" />
          </div>
        ) : advice ? (
          <p className="text-sm leading-relaxed text-text-secondary">{advice.text}</p>
        ) : (
          <p className="text-sm leading-relaxed text-text-muted">{placeholder}</p>
        )}

        <button
          className="btn mt-4 w-full gap-1.5 text-sm text-iris disabled:opacity-40"
          disabled={!enabled || loading}
          onClick={generate}
        >
          <Sparkle size={13} />
          {loading ? 'Generating…' : advice ? 'Regenerate' : 'Generate'}
        </button>
      </div>
    </div>
  )
}
