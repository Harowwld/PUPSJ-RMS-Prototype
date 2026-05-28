/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./next-app/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}
