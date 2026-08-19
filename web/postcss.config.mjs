// Tailwind v4 pipeline — needed so HeroUI's stylesheet (`@import "tailwindcss"`)
// is processed. Plain CSS (globals.css) passes through untouched.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
