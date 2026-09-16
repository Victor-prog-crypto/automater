/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './app.js', './automation-core.js'],
  theme: {
    extend: {
      colors: {
        ink: '#10211b',
        forest: '#0b6b4b',
        mint: '#dff5e9',
        cream: '#f7f8f3',
        coral: '#e75d43'
      },
      boxShadow: {
        card: '0 16px 42px -24px rgba(16, 33, 27, 0.32)',
        dock: '0 -14px 40px -24px rgba(16, 33, 27, 0.35)'
      }
    }
  },
  plugins: []
};
