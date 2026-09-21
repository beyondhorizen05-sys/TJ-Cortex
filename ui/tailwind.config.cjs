const tokens = require('../branding/colors/tailwind.tokens.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: tokens.colors,
      backgroundImage: tokens.backgroundImage,
      fontFamily: tokens.fontFamily,
      borderRadius: tokens.borderRadius,
      transitionDuration: tokens.transitionDuration,
      blur: tokens.blur,
      fontSize: {
        'display-xl': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-l': ['36px', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'h1': ['28px', { lineHeight: '1.2' }],
        'h2': ['22px', { lineHeight: '1.25' }],
        'h3': ['18px', { lineHeight: '1.3' }],
        'body-l': ['16px', { lineHeight: '1.5' }],
        'body-m': ['14px', { lineHeight: '1.5' }],
        'body-s': ['12px', { lineHeight: '1.4' }],
        'mono': ['13px', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
};