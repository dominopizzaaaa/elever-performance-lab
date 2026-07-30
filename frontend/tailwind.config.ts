import type { Config } from 'tailwindcss';

/**
 * Futuristic dark theme. Colours are exposed as CSS variables in globals.css so
 * a member's accent (cyan / lime / magenta) can be swapped at runtime without
 * regenerating utility classes.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          900: '#03050b',
          800: '#060a14',
          700: '#0a1120',
          600: '#101a2e',
          500: '#18243d',
        },
        neon: {
          cyan: '#3df0ff',
          blue: '#4d8dff',
          violet: '#a06bff',
          magenta: '#ff44c8',
          lime: '#b6ff3c',
          amber: '#ffb63c',
          red: '#ff4d6a',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          soft: 'rgb(var(--accent-rgb) / 0.14)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 24px -6px rgb(var(--accent-rgb) / 0.55)',
        'neon-lg': '0 0 60px -12px rgb(var(--accent-rgb) / 0.65)',
        inset: 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to bottom, rgb(3 5 11 / 0) 0%, rgb(3 5 11 / 0.9) 70%, rgb(3 5 11) 100%)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        'scan-down': {
          '0%': { transform: 'translateY(-110%)' },
          '100%': { transform: 'translateY(110%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'draw-line': {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 3.5s ease-in-out infinite',
        'scan-down': 'scan-down 7s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'fade-up': 'fade-up 0.45s ease-out both',
        ticker: 'ticker 30s linear infinite',
        'spin-slow': 'spin-slow 24s linear infinite',
        'draw-line': 'draw-line 1.6s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
