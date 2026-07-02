/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand primary: Teal Vibrante #21b2b8 (from official portfolio)
        brand: {
          50:      "#f0fbfb",
          100:     "#d0f4f5",
          200:     "#a5eaec",
          300:     "#6fd9dc",
          400:     "#3dc4c9",
          500:     "#21b2b8",
          DEFAULT: "#21b2b8",
          600:     "#1a8f94",
          700:     "#166f73",
          800:     "#135659",
          900:     "#0f4245",
        },
        // Accent: Rosa Pastel / Blush #f5b7b1
        blush: {
          50:      "#fef6f5",
          100:     "#fce8e6",
          200:     "#f8cdc9",
          300:     "#f5b7b1",
          DEFAULT: "#f5b7b1",
          400:     "#ef9b94",
          500:     "#e67d74",
        },
        gold: {
          DEFAULT: "#CA8A04",
          50:  "#FEFCE8",
          100: "#FEF9C3",
          200: "#FEF08A",
          300: "#FDE047",
          400: "#FACC15",
          500: "#EAB308",
          600: "#CA8A04",
          700: "#A16207",
          800: "#854D0E",
          900: "#713F12",
        },
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        brand:   ["'Dancing Script'", "cursive"],
        display: ["'Montserrat'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
