/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#050a0f',
        surface: '#0a1420',
        surface2: '#0f1e2e',
        cyan: { DEFAULT: '#00d4ff', dim: 'rgba(0,212,255,0.1)' },
        red: { DEFAULT: '#ff2233', dim: 'rgba(255,34,51,0.15)' },
        amber: { DEFAULT: '#ffb000' },
        neon: { green: '#00ff88' },
      },
      fontFamily: {
        hud: ['Rajdhani', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
