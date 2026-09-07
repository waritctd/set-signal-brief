/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        ground: { DEFAULT: "#F4F7F6", dark: "#0F1918" },
        surface: { DEFAULT: "#FFFFFF", dark: "#162220" },
        ink: { DEFAULT: "#15201E", dark: "#E4ECEA" },
        muted: { DEFAULT: "#66746F", dark: "#93A3A0" },
        line: { DEFAULT: "#D9E1DF", dark: "#273633" },
        teal: { DEFAULT: "#1E6B62", soft: "#DDEDEA", dark: "#62C2B4", softdark: "#1B3733" },
        amber: { DEFAULT: "#C0791A", soft: "#F6E8D3", dark: "#E1A04A", softdark: "#3A2B14" },
        up: { DEFAULT: "#2E7D4F", dark: "#6BC48F" },
        down: { DEFAULT: "#B4423A", dark: "#E08A83" },
      },
    },
  },
  plugins: [],
};
