/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        santara: {
          cream: '#FDF8F3',
          foam: '#FFFCF9',
          latte: '#E8DDD4',
          bean: '#6F4E37',
          roast: '#2C1810',
          clay: '#B46A3C',
          sage: '#6F7F5C',
          gold: '#C9A962',
          caramel: '#D4915C',
          espresso: '#1A0F0A',
          mist: 'rgba(255,252,249,0.85)',
        },
      },
      boxShadow: {
        soft: '0 4px 20px rgba(44, 24, 16, 0.08)',
        elegant: '0 8px 32px rgba(44, 24, 16, 0.12)',
        glow: '0 0 24px rgba(201, 169, 98, 0.35)',
        'glow-sm': '0 0 12px rgba(201, 169, 98, 0.25)',
        'inner-soft': 'inset 0 2px 4px rgba(44, 24, 16, 0.06)',
      },
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        bounceSubtle: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium': 'linear-gradient(135deg, #6F4E37 0%, #B46A3C 100%)',
        'gradient-warm': 'linear-gradient(180deg, #FDF8F3 0%, #E8DDD4 100%)',
        'gradient-gold': 'linear-gradient(135deg, #C9A962 0%, #D4915C 100%)',
      },
    },
  },
  plugins: [],
};
