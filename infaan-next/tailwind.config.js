/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./frontend/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#0f1f27",
          light: "#1a3a4a",
        },
        surface: "rgba(243, 250, 253, 0.84)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        paper: "var(--paper)",
        "paper-strong": "var(--paper-strong)",
        accent: "var(--accent)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
    },
  },
  plugins: [],
};
