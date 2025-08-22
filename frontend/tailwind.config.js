/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true, // sempre centralizar
      padding: {
        DEFAULT: "1rem", // padding lateral padrão
        lg: "2rem",      // em telas grandes
        xl: "2rem",
      },
      screens: {
        // Forçamos “desktop first”
        lg: "1024px",
        xl: "1280px",
        "2xl": "1320px", // largura máxima confortável
      },
    },
    extend: {},
  },
  plugins: [],
}
