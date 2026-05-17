import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        agents: {
          black: "#f6eddd",
          white: "#302f2c",
          gray: "#876d5d",
          veil: "rgba(48, 47, 44, 0.08)"
        }
      },
      fontFamily: {
        display: ["Fredoka", "Inter Display", "Inter Display Placeholder", "sans-serif"],
        inter: ["Nunito", "Inter", "Inter Placeholder", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
