import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-base": "#050506",
        "bg-elevated": "#0a0a0c",
        "text-primary": "#EDEDEF",
        "text-muted": "#8A8F98",
        accent: "#5E6AD2",
      },
      boxShadow: {
        elevated:
          "0 0 0 1px rgba(255,255,255,0.06),0 2px 20px rgba(0,0,0,0.4),0 0 40px rgba(0,0,0,0.2)",
      },
      keyframes: {
        blobPulse: {
          "0%, 100%": { opacity: "0.12", transform: "scale(1)" },
          "50%": { opacity: "0.2", transform: "scale(1.08)" },
        },
      },
      animation: {
        blobPulse: "blobPulse 10s ease-in-out infinite",
      },
    },
  },
};

export default config;
