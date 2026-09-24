import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vanta: {
          950: '#000000',
          900: '#050505',
          850: '#0a0a0a',
          800: '#121212',
          700: '#1a1a1a',
          border: '#262626',
          muted: '#808080',
          green: '#00ff66',
          red: '#ff3344',
          yellow: '#ffcc00',
          orange: '#ff8800',
          cyan: '#00e5ff',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-green': 'flashGreen 1.5s ease-out',
        'flash-red': 'flashRed 1.5s ease-out',
      },
      keyframes: {
        flashGreen: {
          '0%': { backgroundColor: 'rgba(0, 255, 102, 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashRed: {
          '0%': { backgroundColor: 'rgba(255, 51, 68, 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
