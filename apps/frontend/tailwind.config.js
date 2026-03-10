export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '2200px',
      },
      colors: {
        background: '#0d0d0d',
        surface: {
          DEFAULT: '#141414',
          hover: '#1a1a1a',
          lighter: '#222222',
        },
        primary: {
          DEFAULT: '#df7f3e',
          hover: '#c96c32',
          glow: 'rgba(223, 127, 62, 0.4)',
        },
        secondary: {
          DEFAULT: '#0ca55a',
          hover: '#0a9d50',
        },
        sage: '#b4d66f',
        warm: '#d5c4b2',
        golden: '#e1a95d',
        arena: {
          blue: '#3b82f6',
          green: '#0ca55a',
        },
        accent: {
          DEFAULT: '#ffffff',
          muted: '#a1a1aa',
        },
        electric: {
          purple: '#a855f7',
          orange: '#f97316',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out infinite 1.5s',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        'blink': {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%23ffffff' fill-opacity='0.02' fill-rule='evenodd'/%3E%3C/svg%3E\")",
        'grid-pattern-subtle': 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
      }
    },
  },
  plugins: [],
}
