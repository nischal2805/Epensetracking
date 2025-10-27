/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
        'sm': '428px',
      },
      maxWidth: {
        'screen-sm': '428px',
      },
    },
  },
  plugins: [],
};
