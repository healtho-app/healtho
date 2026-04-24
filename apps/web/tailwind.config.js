/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Brand (new identity) ───────────────────────────────
        primary:           '#8b5cf6',   // Pulse Purple
        'primary-dark':    '#7c3aed',   // Deeper purple
        'brand-pink':      '#e879f9',   // Gradient start
        'brand-cyan':      '#22d3ee',   // Gradient end
        // ── Backgrounds ───────────────────────────────────────
        'background-dark': '#030213',   // Deep navy-black
        surface:           '#0e0b1e',   // Dark card surface
        'surface-2':       '#1a1640',   // Slightly lighter surface
        // ── Nutrition macros (unchanged) ──────────────────────
        protein:           '#5b8def',
        carbs:             '#e8b84b',
        fat:               '#e07b5b',
        fiber:             '#4caf7d',
        water:             '#60b8d4',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #e879f9 0%, #8b5cf6 50%, #22d3ee 100%)',
      },
      fontFamily: {
        display: ['Lexend', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg:      '0.5rem',
        xl:      '0.75rem',
        '2xl':   '1rem',
        full:    '9999px',
      },
    },
  },
  plugins: [],
}
