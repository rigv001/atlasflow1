/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0f172a',
        'soft-teal': '#14b8a6',
        'light-teal': '#5eead4',
      }
    },
  },
  plugins: [],
}