import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        salvo: {
          primary:       "#05C3B2",
          "primary-dark":"#04A899",
          "primary-glow":"rgba(5,195,178,0.18)",
          ocean:         "#061826",
          "ocean-mid":   "#0A2438",
          "ocean-light": "#0D2F4A",
          gold:          "#F0A500",
          "gold-light":  "#F5C842",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
