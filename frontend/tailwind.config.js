/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // App surface scale (zinc-based dark)
        surface: {
          base:    '#09090b',
          DEFAULT: '#0f0f12',
          elevated:'#18181b',
          overlay: '#27272a',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          hover:   '#7c3aed',
          muted:   '#8b5cf620',
        },
      },
      borderColor: {
        subtle: '#27272a',
        soft:   '#3f3f46',
      },
      opacity: {
        6: '0.06',
        8: '0.08',
        15: '0.15',
      },
      animation: {
        'spin-slow':   'spin 3s linear infinite',
        'pulse-slow':  'pulse 3s ease-in-out infinite',
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.2s ease-out',
        'slide-right': 'slideRight 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'card':    '0 1px 3px 0 #00000060, 0 0 0 1px #ffffff08',
        'panel':   '0 8px 32px 0 #00000080, 0 0 0 1px #ffffff08',
        'glow-sm': '0 0 16px 0 #8b5cf630',
        'glow':    '0 0 32px 0 #8b5cf640',
      },
    },
  },
  plugins: [],
}
