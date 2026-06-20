import type { SVGProps } from 'react'

/** A small, consistent 1.5px-stroke icon set (Lucide-style) so the UI never
 *  falls back to emoji. All icons inherit `currentColor` and size via `width`. */

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 16, strokeWidth = 1.75, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  }
}

/** Brand mark — a stylised bus inside a rounded badge ("park the bus"). */
export function Logo({ size = 28, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...rest}>
      <rect x="1" y="1" width="30" height="30" rx="9" className="fill-surface-2 stroke-border-strong" strokeWidth="1.5" />
      <rect x="8" y="9" width="16" height="11" rx="2.5" className="stroke-accent" strokeWidth="1.8" fill="none" />
      <path d="M8 14.5h16" className="stroke-accent" strokeWidth="1.6" />
      <circle cx="11.5" cy="22" r="1.6" className="fill-accent" />
      <circle cx="20.5" cy="22" r="1.6" className="fill-accent" />
      <path d="M11 12.2h3M18 12.2h3" className="stroke-accent/70" strokeWidth="1.4" />
    </svg>
  )
}

export const Sparkle = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l1.9 4.9L18.8 9.8 13.9 11.7 12 16.6l-1.9-4.9L5.2 9.8l4.9-1.9z" />
    <path d="M19 14l.8 2L22 16.8 20 17.6 19.2 19.6 18.4 17.6 16.4 16.8 18.4 16z" />
  </svg>
)

export const Clock = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)

export const Refresh = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 4v5h-5" />
  </svg>
)

export const Plus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const Close = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export const Check = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

export const CheckCircle = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5 11 15l4.5-5" />
  </svg>
)

export const AlertTriangle = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
)

export const Info = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
)

export const ArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const ArrowLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
)

export const Trophy = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4h10v4a5 5 0 0 1-10 0Z" />
    <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 2.5M17 6h2.5a2.5 2.5 0 0 1-2.5 2.5" />
    <path d="M12 13v4M9 21h6M10 17h4l-.5 4h-3z" />
  </svg>
)

export const Layers = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="M3 13l9 5 9-5M3 18l9 5 9-5" />
  </svg>
)

export const Bolt = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
)

export const Shield = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

export const Lock = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4.5" y="11" width="15" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

export const ExternalLink = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 3h6v6M21 3l-9 9" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
)

export const Dot = ({ size = 8, className = '', ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 8 8" fill="currentColor" className={className} {...rest}>
    <circle cx="4" cy="4" r="4" />
  </svg>
)
