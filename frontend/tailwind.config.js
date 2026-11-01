/** @type {import('tailwindcss').Config} */
// Токены сняты с макета Figma (кадр 1728×1117), см. docs/PLAN.md
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        side: 'rgb(var(--side) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        field: 'rgb(var(--field) / <alpha-value>)',
        'field-ink': 'rgb(var(--field-ink) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
