/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coffee: {
          light: '#b46a3c',
          DEFAULT: '#6f4e37',
          dark: '#4a3728',
        },
        cream: {
          DEFAULT: '#faf7f2',
          warm: '#f5f0e8',
        },
        santara: {
          cream: '#faf7f2',
          foam: '#fffcf8',
          latte: '#e8ddd4',
          bean: '#6f4e37',
          roast: '#2c1810',
          clay: '#b46a3c',
          sage: '#6f7f5c',
          gold: '#c9a962',
          caramel: '#d4915c',
          espresso: '#1a0f0a',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(44, 24, 16, 0.06)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.06)',
        'btn': '0 4px 14px rgba(111, 78, 55, 0.35)',
        'btn-hover': '0 6px 20px rgba(111, 78, 55, 0.45)',
        'glow': '0 0 30px rgba(111, 78, 55, 0.3)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
