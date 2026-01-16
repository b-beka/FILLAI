/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0a0a',
        'dark-surface': '#141414',
        'dark-elevated': '#1e1e1e',
        'accent-primary': '#10b981', // Emerald 500
        'accent-secondary': '#0ea5e9', // Sky 500
        'accent-error': '#ef4444',
        'glow-primary': 'rgba(16, 185, 129, 0.4)',
        'glow-secondary': 'rgba(14, 165, 233, 0.4)',
        'grid-line': '#262626',
      },
      backdropBlur: {
        'glass': '20px',
      },
      animation: {
        'breathe': 'breathe 4s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 6s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

