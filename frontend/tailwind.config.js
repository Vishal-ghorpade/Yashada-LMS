/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        yashada: {
          navy: '#0A2540',
          navyLight: '#163B60',
          gold: '#D4AF37',
          goldLight: '#F3D266',
          sand: '#FAF6ED',
          sandDark: '#F2E8D2',
          accent: '#C5A880'
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
