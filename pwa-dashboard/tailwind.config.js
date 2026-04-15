/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a", // Deep black background matching reference
        foreground: "#f8fafc",
        card: "#121212", // Clean dark card background
        primary: {
          DEFAULT: "#38bdf8", // Sky blue for primary active state, matching reference numbers
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#eab308", // Yellow accent
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#1e293b",
          foreground: "#94a3b8",
        },
        "health-green": "#84cc16", // Lime green for active stats
        "health-yellow": "#f59e0b",
        "health-red": "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
        mono: ["var(--font-fira-code)", "monospace"],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 15px 0px rgba(14, 165, 233, 0.4)' },
          '50%': { opacity: .8, boxShadow: '0 0 30px 5px rgba(14, 165, 233, 0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
};

module.exports = config;
