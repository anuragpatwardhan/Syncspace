/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f7f8fb',
          100: '#eef0f6',
          200: '#d9dde9',
          300: '#b6bdd1',
          400: '#8b95b3',
          500: '#646e8c',
          600: '#475068',
          700: '#343a4d',
          800: '#1c2030',
          850: '#141826',
          900: '#0d101c',
          950: '#070912',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          glow: '#a78bfa',
        },
      },
      backgroundImage: {
        'mesh-1':
          'radial-gradient(at 20% 20%, rgba(139,92,246,0.25) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(236,72,153,0.18) 0px, transparent 50%), radial-gradient(at 0% 80%, rgba(6,182,212,0.18) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(168,85,247,0.18) 0px, transparent 50%)',
        'grid-faint':
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-32': '32px 32px',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px -10px rgba(139,92,246,0.35)',
        'inner-soft': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: 0.6 },
          '50%': { opacity: 1 },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'gradient-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease both',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 2.5s linear infinite',
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'gradient-spin': 'gradient-spin 8s linear infinite',
      },
    },
  },
  plugins: [],
};
