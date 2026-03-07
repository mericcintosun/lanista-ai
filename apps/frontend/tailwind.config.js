export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%23ffffff' fill-opacity='0.02' fill-rule='evenodd'/%3E%3C/svg%3E\")",
      }
    },
  },
  plugins: [],
}
