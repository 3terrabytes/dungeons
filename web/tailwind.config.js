/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rarity: {
          common: "#94a3b8",
          uncommon: "#22c55e",
          rare: "#3b82f6",
          epic: "#a855f7",
          legendary: "#f59e0b",
        },
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
