import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Logo, Dot } from './Icon'

const NAV = [
  { to: '/', label: 'Markets' },
  { to: '/rfq/new', label: 'Bet' },
  { to: '/market-maker', label: 'Make Markets' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/settle', label: 'Settle' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const active = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to)

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <Logo size={30} className="transition-transform duration-300 ease-spring group-hover:scale-105" />
            <span className="font-display text-[17px] font-bold tracking-tightest text-text-primary">
              Park&nbsp;The&nbsp;Bus
            </span>
            <span className="chip ml-1 hidden border-accent/25 bg-accent/5 text-accent sm:inline-flex">
              <Dot size={6} className="text-accent" /> devnet
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <div className="hidden items-center gap-0.5 rounded-xl border border-border/70 bg-surface/40 p-1 sm:flex">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition duration-200 ${
                    active(n.to)
                      ? 'bg-surface-3 text-text-primary shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </div>
            <div className="ml-2 sm:ml-3">
              <WalletMultiButton />
            </div>
          </nav>
        </div>
      </header>

      {/* mobile nav */}
      <nav className="flex items-center gap-0.5 overflow-x-auto border-b border-border/80 bg-bg/70 px-4 py-2 backdrop-blur-xl sm:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active(n.to) ? 'bg-surface-3 text-text-primary' : 'text-text-muted'
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      <footer className="border-t border-border/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-text-muted sm:flex-row">
          <span className="flex items-center gap-2">
            <Logo size={18} />
            Park The Bus · P2P football prediction market
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Dot size={6} className="text-accent" /> Solana devnet
            </span>
            <span className="text-accent">0% house edge</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
