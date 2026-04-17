/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        dark: {
          900: '#060B14', // Ultra deep midnight
          800: '#0E1627', // Card backdrop
          700: '#1A2338', // Border/Hover states
        },
        primary: {
          500: '#3b82f6',
          400: '#60a5fa',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
