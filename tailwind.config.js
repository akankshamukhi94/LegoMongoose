/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [`./views/**/*.ejs`], 
  // ...
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
  
};

