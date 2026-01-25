/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ========================================
        // UNIFIED DESIGN SYSTEM - Rotaract NYC
        // ========================================
        
        // Primary Brand Colors
        primary: {
          DEFAULT: '#8f29a3',
          50: '#faf5fb',
          100: '#f4eaf7',
          200: '#ebd5f0',
          300: '#dbb4e3',
          400: '#c687d2',
          500: '#8f29a3',
          600: '#7f248f',
          700: '#6a1e77',
          800: '#591a64',
          900: '#4b1854',
        },
        
        // Secondary/Accent Colors
        accent: {
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
        },
        
        // Blue accent (for buttons, links in portal/admin)
        blue: {
          DEFAULT: '#005dAA',
          50: '#eff8ff',
          100: '#daf0ff',
          200: '#bee4ff',
          300: '#91d3ff',
          400: '#5cb9fc',
          500: '#3699f9',
          600: '#207aee',
          700: '#1862d9',
          800: '#1a51af',
          900: '#005dAA',
        },
        
        // Legacy Rotaract Pink (backward compatibility)
        rotaract: {
          pink: '#ac005a',
          darkpink: '#5a0732',
          white: '#ffffff',
          blue: '#005dAA',
        },
        
        // Semantic Surface Colors
        surface: {
          light: '#ffffff',
          dark: '#1e1e1e',
          'light-secondary': '#f9fafa',
          'dark-secondary': '#141414',
        },
        
        // Background Colors - UNIFIED
        background: {
          light: '#f9fafa',
          dark: '#0f0f12',
          'light-alt': '#f4f4f5',
          'dark-alt': '#18181b',
        },
        
        // Border Colors - UNIFIED
        border: {
          light: '#e5e7eb',
          dark: '#2a2a2e',
          'light-subtle': '#f3f4f6',
          'dark-subtle': '#27272a',
        },
        
        // Text Colors - UNIFIED
        text: {
          primary: '#111827',
          secondary: '#4b5563',
          muted: '#6b7280',
          'primary-dark': '#f9fafb',
          'secondary-dark': '#d1d5db',
          'muted-dark': '#9ca3af',
        },
        
        // Status Colors
        status: {
          success: '#10b981',
          'success-light': '#d1fae5',
          warning: '#f59e0b',
          'warning-light': '#fef3c7',
          error: '#ef4444',
          'error-light': '#fee2e2',
          info: '#3b82f6',
          'info-light': '#dbeafe',
        },
      },
      
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Epilogue', 'Plus Jakarta Sans', 'Manrope', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
      },
      
      // Unified Container
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          lg: '2rem',
        },
      },
      
      // Unified Max Widths
      maxWidth: {
        'container': '1280px',
        'container-sm': '1024px',
        'container-lg': '1440px',
      },
      
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        full: '9999px',
      },
      
      boxShadow: {
        'soft': '0 4px 20px rgba(0,0,0,0.05)',
        'soft-hover': '0 10px 25px rgba(0,0,0,0.08)',
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 0 4px rgba(0,0,0,0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 40px -10px rgba(0,0,0,0.15)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'nav': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
      },
      
      // Unified Animation Timing
      transitionDuration: {
        DEFAULT: '200ms',
        fast: '150ms',
        slow: '300ms',
      },
      
      // Unified Z-Index Scale
      zIndex: {
        'nav': '50',
        'dropdown': '60',
        'modal-backdrop': '70',
        'modal': '80',
        'toast': '90',
        'tooltip': '100',
      },
      
      // Unified Spacing for Sections
      spacing: {
        'section': '5rem',
        'section-sm': '3rem',
        'section-lg': '7rem',
      },
    },
  },
  plugins: [],
}
