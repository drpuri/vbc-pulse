import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'SF Mono'", "'Fira Code'", "'Cascadia Code'", "monospace"],
      },
      colors: {
        terminal: {
          bg: "#0a0a0f",
          surface: "#12121a",
          border: "#1e1e2e",
          text: "#e0e0e8",
          muted: "#6b6b80",
          accent: "#00d4aa",
          warn: "#f5a623",
          danger: "#ff4757",
        },
      },
    },
  },
  plugins: [],
};

export default config;
