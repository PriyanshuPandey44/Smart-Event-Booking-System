/** Palette comes from a dusk-over-the-peaks sky: ink night, violet ridge, rose glow. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121638',
        ridge: '#2A2F6B',
        dusk: '#3B2F8F',
        glow: '#FF4D8D',
        mist: '#F4F5FB',
        line: '#E3E5F2',
        sky2: '#7DD3FC',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 18px 40px -18px rgba(18,22,56,.35)',
      },
    },
  },
  plugins: [],
};
