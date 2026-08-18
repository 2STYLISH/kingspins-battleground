import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // KINGPINS BATTLEGROUND — pure black, gray, white monochrome palette
        surface: {
          950: '#080808', // page background — near-black
          900: '#111111', // primary surface
          800: '#1a1a1a', // card background
          700: '#262626', // elevated card
          600: '#333333', // border/hairline
          500: '#404040', // subtle divider
        },
        silver: {
          DEFAULT: '#d4d4d4',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
        },
        // Accent white for primary CTAs
        accent: '#ffffff',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      backgroundImage: {
        'grid-subtle': 'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 40px)',
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
