/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      height: {
        '70vh': '70vh',
      }
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]};
