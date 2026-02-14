/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'civil-blue': '#2563EB',
        'civil-dark': '#1E293B',
        'civil-light': '#F8FAFC',
      },
    },
  },
  plugins: [],
}