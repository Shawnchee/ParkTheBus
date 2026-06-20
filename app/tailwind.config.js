/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm ivory base — Claude palette, bright but not stark white
        bg: '#F0EDE4',
        surface: '#FBFAF5',
        'surface-2': '#F4F1E8',
        'surface-3': '#EAE6DA',
        border: '#E4DFD1',
        'border-strong': '#D2CBB9',

        // Claude coral — the single primary accent
        accent: '#D97757',
        'accent-dim': '#C15F3C',

        // Muted secondaries (no green, no purple)
        iris: '#5E7CA3',
        sky: '#4B7BB5',
        warning: '#B07D2B',
        danger: '#BE4435',

        // Warm three-tier text ramp on light
        'text-primary': '#21201B',
        'text-secondary': '#6B6558',
        'text-muted': '#9A9384',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      keyframes: {
        pulseOpacity: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'odds-pulse': 'pulseOpacity 2.4s ease-in-out infinite',
        'fade-up': 'fadeUp 0.4s ease-out both',
        'fade-in': 'fadeIn 0.3s ease-out both',
        shimmer: 'shimmer 1.8s linear infinite',
        marquee: 'marquee 40s linear infinite',
      },
      boxShadow: {
        // Soft warm elevation for a light surface — low opacity, no glow
        card: '0 1px 2px rgba(45,40,30,0.06)',
        elevated: '0 8px 30px rgba(45,40,30,0.10)',
        glow: '0 4px 12px rgba(45,40,30,0.08)',
        'glow-sm': '0 2px 8px rgba(45,40,30,0.06)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
}
