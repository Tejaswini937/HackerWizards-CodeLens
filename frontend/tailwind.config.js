/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F2FA',      // lavender-white page background
        canvas2: '#EFEAF8',     // slightly deeper lavender for section washes
        ink: '#1C1530',         // primary text, near-black violet
        muted: '#6F6685',       // secondary text
        panel: '#17112B',       // dark floating panel background
        panel2: '#1F1839',      // dark panel secondary surface
        violet: {
          50: '#F4F0FC',
          100: '#E7DEFA',
          300: '#BDA3F0',
          500: '#7C3AED',
          600: '#6D28D9',
          700: '#5B21B6',
        },
        line: '#E4DEF2',        // hairline borders on light surfaces
        lineDark: '#332B54',    // hairline borders on dark surfaces
      },
      fontFamily: {
        display: ['"Manrope"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.75rem',
        xl3: '2.25rem',
      },
      boxShadow: {
        soft: '0 20px 60px -20px rgba(28, 21, 48, 0.25)',
        panel: '0 30px 80px -30px rgba(23, 17, 43, 0.55)',
      },
    },
  },
  plugins: [],
}
