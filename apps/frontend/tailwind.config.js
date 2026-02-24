export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030303',
        surface: {
          DEFAULT: '#0a0a0a',
          hover: '#121212',
          lighter: '#1a1a1a',
        },
        primary: {
          DEFAULT: '#ff2d2d',
          hover: '#e62626',
          glow: 'rgba(255, 45, 45, 0.4)',
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
