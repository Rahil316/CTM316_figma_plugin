/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      gridTemplateColumns: {
        'swatches': 'repeat(auto-fill, minmax(60px, 1fr))',
      }
    },
  },
  plugins: [],
}
