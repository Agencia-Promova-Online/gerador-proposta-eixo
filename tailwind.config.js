/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FBF8F0',
          100: '#F5EDD8',
          200: '#EBDBB1',
          300: '#DCC588',
          400: '#CDB05F',
          500: '#B8963F',
          600: '#A07F33',
          700: '#83682B',
          800: '#665024',
          900: '#4D3C1B',
        },
        ink: {
          50: '#F6F6F6',
          100: '#E2E2E2',
          200: '#C5C5C5',
          300: '#9E9E9E',
          400: '#6E6E6E',
          500: '#4A4A4A',
          600: '#333333',
          700: '#222222',
          800: '#171717',
          900: '#111111',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
