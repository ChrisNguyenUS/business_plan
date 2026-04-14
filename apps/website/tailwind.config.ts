import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // MannaOS dark navy palette (PRD §7)
        navy: {
          950: "#060E1A",
          900: "#0A1628",
          700: "#1E3A5F",
        },
        accent: {
          blue: "#4F8EF7",
          purple: "#7B2FBE",
        },
        gold: "#F5A623",
        // Text
        "text-primary": "#FFFFFF",
        "text-secondary": "#E2E8F0",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #060E1A 0%, #0A1628 50%, #1E3A5F 100%)",
        "accent-gradient": "linear-gradient(135deg, #4F8EF7, #7B2FBE)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        glass: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
