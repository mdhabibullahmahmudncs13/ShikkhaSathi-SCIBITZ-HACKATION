/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#DDFF00', // Neon yellow - vibrant and energetic
          50: '#F9FFE6',
          100: '#F4FFCC',
          200: '#EEFF99',
          300: '#E8FF66',
          400: '#E2FF33',
          500: '#DDFF00',
          600: '#B0CC00',
          700: '#849900',
          800: '#586600',
          900: '#2C3300',
        },
        secondary: {
          DEFAULT: '#8B5CF6', // Purple - represents creativity and innovation
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },
        accent: {
          DEFAULT: '#06B6D4', // Cyan - represents technology and clarity
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        bengali: ['Noto Sans Bengali', 'system-ui', 'sans-serif'],
        'hind-siliguri': ['Hind Siliguri', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'neon': '0 0 20px rgba(221, 255, 0, 0.3), 0 0 40px rgba(221, 255, 0, 0.1)',
      }
    },
  },
}
