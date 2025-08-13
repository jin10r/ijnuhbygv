/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        telegram: {
          bg: '#17212b',
          secondary: '#242f3d',
          text: '#ffffff',
          button: '#2481cc',
          accent: '#64b5ef'
        }
      }
    },
  },
  plugins: [],
}