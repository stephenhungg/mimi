import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        agents: {
          black: "#080808",
          white: "#f0f0f0",
          gray: "#86868b",
          veil: "rgba(240, 240, 240, 0.05)"
        }
      },
      fontFamily: {
        display: ["Inter Display", "Inter Display Placeholder", "sans-serif"],
        inter: ["Inter", "Inter Placeholder", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
