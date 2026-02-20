/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        cranberry: {
          DEFAULT: '#9B1B30',
          50: '#fef2f3',
          100: '#fde6e8',
          200: '#fbd0d6',
          300: '#f7aab5',
          400: '#f07a8d',
          500: '#e54d66',
          600: '#d12d4a',
          700: '#9B1B30',
          800: '#8b1a2d',
          900: '#771a2c',
          950: '#3d0a14',
        },
        gold: {
          DEFAULT: '#EBC85B',
          50: '#fefbf0',
          100: '#fcf5dc',
          200: '#f9e9b7',
          300: '#f3d885',
          400: '#ebc85b',
          500: '#e0b235',
          600: '#c99323',
          700: '#a7711f',
          800: '#885a20',
          900: '#6f4a1e',
          950: '#3d2710',
        },
        azure: {
          DEFAULT: '#005dAA',
          50: '#eff8ff',
          100: '#daf0ff',
          200: '#bde4ff',
          300: '#90d4ff',
          400: '#5cbaff',
          500: '#369cfc',
          600: '#1f7ef1',
          700: '#1766de',
          800: '#1953b4',
          900: '#005dAA',
          950: '#0a2c56',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
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
