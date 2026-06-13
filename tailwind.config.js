/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        santara: {
          cream: '#fff8ef',
          latte: '#f1dfc5',
          foam: '#fffaf4',
          bean: '#6f4e37',
          roast: '#3f281c',
          clay: '#b46a3c',
          sage: '#6f7f5c',
        },
      },
      boxShadow: {
        soft: '0 18px 50px rgba(63, 40, 28, 0.10)',
      },
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
