/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './dashboard.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pockest 브랜드 컬러
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7548B8', // Main Brand Color
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
      },
      fontFamily: {
        // Pretendard 및 일어 폰트 최우선 배치
        sans: [
          'Pretendard Variable',
          'Pretendard',
          'Hiragino Kaku Gothic ProN',
          'Hiragino Sans',
          'Meiryo',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      width: {
        'popup': '600px',
      },
      height: {
        'popup': '500px',
      },
      animation: {

        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {

        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
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


