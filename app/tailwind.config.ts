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
        bg: '#000000',
        surface: { DEFAULT: '#141414', hover: '#1a1a1a' },
        accent: { DEFAULT: '#FF9F43', glow: 'rgba(255,159,67,0.35)', dim: 'rgba(255,159,67,0.12)' },
        positive: '#22C55E',
        negative: '#EF4444',
        series: {
          1: '#FF9F43', 2: '#EF4444', 3: '#A592D5',
          4: '#2DD4BF', 5: '#60A5FA', 6: '#F472B6',
        },
      },
      textColor: {
        primary: 'rgba(255,255,255,0.95)',
        secondary: 'rgba(255,255,255,0.72)',
        muted: 'rgba(255,255,255,0.48)',
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.08)',
        hover: 'rgba(255,255,255,0.12)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        page: '1400px',
      },
      borderRadius: {
        sm: '5px',
        md: '6px',
        lg: '10px',
        xl: '12px',
      },
    },
  },
  plugins: [],
};
export default config;
