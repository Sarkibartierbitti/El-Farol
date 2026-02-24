/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bar': {
          'empty': '#22c55e',
          'crowded': '#ef4444',
          'threshold': '#eab308',
        }
      }
    },
  },
  plugins: [],
}
