// biliarDino theme. Colours follow the brand palette (docs/BRAND.md): celeste for the brand and
// actions, cool blue-grey neutrals, and tokens that change between light and dark (CSS variables
// in src/styles/globals.css) wherever a single shade can't be readable on both backgrounds.
const themed = name => `rgb(var(--c-${name}) / <alpha-value>)`;

const celeste = {
  50: "#EEF9FE",
  100: "#D6F1FC",
  200: "#B2E6FA",
  300: "#7FD3F5",
  400: "#45BAEC",
  500: "#0A78AD", // actions: buttons (white text 4.9:1), links on light
  600: "#0B6896",
  700: "#0E5579",
  800: "#103F59",
  900: "#0A2A3D",
  950: "#071C29",
};

module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        celeste,
        blue: celeste,
        sky: celeste,
        gray: {
          50: "#F7FAFC",
          100: "#F0F5F9", // page background (light)
          200: "#DCE7EF", // borders, chips
          300: "#C2D1DD",
          400: themed("gray-400"), // secondary text
          500: themed("gray-500"), // muted text
          600: "#3B4F63",
          700: "#22384B", // borders (dark)
          800: "#112231", // cards (dark)
          900: "#0A1621", // page background (dark), body text (light)
          950: "#060E16",
        },
        green: { 500: themed("green-500"), 600: "#15803D" }, // wins, +rating
        red: { 500: themed("red-500"), 600: "#B42318" }, // losses, errors, delete
        sole: { DEFAULT: "#F2A20C", light: "#FFC24D" }, // highlights
      },
      fontFamily: {
        brand: [
          "var(--font-brand)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
