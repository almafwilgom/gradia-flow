/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9ecff',
          200: '#b6d9ff',
          300: '#83beff',
          400: '#4f9bff',
          500: '#1f6fff',
          600: '#0f52e6',
          700: '#0c41b4',
          800: '#0f398f',
          900: '#112f72'
        },
        sidebar: {
          DEFAULT: '#273142', // Represents the dark navy backdrop in the screenshot
          active: '#313d4f'
        },
        ui: {
          orange: '#FF8A00',
          blue: '#1976D2',
          green: '#4CAF50',
          purple: '#9C27B0'
        }
      },
      boxShadow: {
        card: '0 4px 20px rgba(0, 0, 0, 0.03)',
        soft: '0 2px 8px rgba(0, 0, 0, 0.02)'
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem'
      }
    }
  },
  plugins: []
};
