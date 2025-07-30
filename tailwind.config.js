/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      height: {
        '70vh': '70vh',
      },
      colors: {
        'neon': {
          'blue': '#00D4FF',
          'purple': '#9D4EDD',
          'green': '#39FF14',
          'pink': '#FF073A',
        },
        'matrix': {
          'dark': '#0D1117',
          'darker': '#010409',
          'accent': '#00FF41',
        }
      },
      backdropBlur: {
        'xs': '2px',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]};
