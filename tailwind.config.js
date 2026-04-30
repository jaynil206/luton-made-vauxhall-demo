/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './app.js'],
  theme: {
    extend: {
      colors: {
        'luton-sky':     '#b7d4da',
        'luton-sky-dark':'#9fc4cc',
        'luton-red':     '#cc3333',
        'luton-red-dark':'#a63025',
        'luton-overlay': '#5e1b16',
        'paper-white':   '#f6f1e4',
        'ink':           '#1f1c19',
      },
      fontFamily: {
        sans:    ['"calder-lc"', 'sans-serif'],
        display: ['"calder-dark-shadow"', 'sans-serif'],
        mono:    ['"Courier New"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        polaroid: '0 4px 6px -1px rgba(0,0,0,0.12), 0 14px 24px -6px rgba(0,0,0,0.2)',
        lifted:   '0 8px 24px -4px rgba(0,0,0,0.18), 0 4px 12px -2px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
