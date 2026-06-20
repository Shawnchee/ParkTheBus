import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { Info, CheckCircle, AlertTriangle, Clock, Close } from './Icon'

export type ToastKind = 'info' | 'success' | 'error' | 'pending'
export interface Toast {
  id: number
  kind: ToastKind
  title: string
  body?: ReactNode
}

interface ToastApi {
  push: (t: Omit<Toast, 'id'>) => number
  update: (id: number, t: Partial<Omit<Toast, 'id'>>) => void
  dismiss: (id: number) => void
}

const ToastCtx = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const STYLES: Record<ToastKind, string> = {
  info: 'border-border',
  success: 'border-accent/40',
  error: 'border-danger/40',
  pending: 'border-warning/40',
}
const ICONS: Record<ToastKind, ComponentType<{ size?: number }>> = {
  info: Info,
  success: CheckCircle,
  error: AlertTriangle,
  pending: Clock,
}
const ICON_TONE: Record<ToastKind, string> = {
  info: 'text-text-secondary',
  success: 'text-accent',
  error: 'text-danger',
  pending: 'text-warning',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((xs) => xs.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = seq.current++
      setToasts((xs) => [...xs, { ...t, id }])
      if (t.kind === 'success' || t.kind === 'info') {
        setTimeout(() => dismiss(id), 7000)
      }
      return id
    },
    [dismiss],
  )

  const update = useCallback((id: number, patch: Partial<Omit<Toast, 'id'>>) => {
    setToasts((xs) => xs.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    if (patch.kind === 'success' || patch.kind === 'error') {
      setTimeout(() => dismiss(id), 7000)
    }
  }, [dismiss])

  return (
    <ToastCtx.Provider value={{ push, update, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => {
          const Glyph = ICONS[t.kind]
          return (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className={`card animate-fade-up border ${STYLES[t.kind]} p-3.5 shadow-elevated`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 ${ICON_TONE[t.kind]} ${
                    t.kind === 'pending' ? 'animate-odds-pulse' : ''
                  }`}
                >
                  <Glyph size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text-primary">{t.title}</div>
                  {t.body && (
                    <div className="mt-0.5 text-xs text-text-muted">{t.body}</div>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="text-text-muted transition hover:text-text-primary"
                >
                  <Close size={15} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
