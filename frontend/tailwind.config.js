/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:          '#137fec',
        'primary-dark':   '#0e63be',
        'background-dark':'#121212',
        surface:          '#1e1e1e',
        'surface-2':      '#2a2a2a',
        protein:          '#5b8def',
        carbs:            '#e8b84b',
        fat:              '#e07b5b',
        fiber:            '#4caf7d',
        water:            '#60b8d4',
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
