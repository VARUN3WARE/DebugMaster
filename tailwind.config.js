/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', '"Manrope"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0b0b0f',
          900: '#111118',
          800: '#1d1e27',
          700: '#2a2c38',
          600: '#3d4050',
        },
        sand: {
          50: '#fdf8f2',
          100: '#f7efe6',
          200: '#efe2d2',
          300: '#e1ccb2',
        },
        ember: {
          400: '#ff7a18',
          500: '#ff5d1a',
          600: '#e44512',
        },
        sea: {
          400: '#3cc3b2',
          500: '#2aa999',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255, 122, 24, 0.2), 0 12px 30px rgba(11, 11, 15, 0.2)',
        soft: '0 18px 40px rgba(11, 11, 15, 0.12)',
      },
    },
  },
  plugins: [],
}

