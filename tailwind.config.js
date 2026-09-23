/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './about.html',
    './reviews.html',
    './scripts/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00BCD4',
        success: '#8BC34A',
        warning: '#FFC107'
      }
    }
  },
  plugins: []
};

