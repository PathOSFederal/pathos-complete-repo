import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // PathOS dark operator theme
        surface: {
          base: '#090b0e',
          card: '#0f1117',
          elevated: '#161b22',
          border: '#1e2430',
          hover: '#1a2030',
        },
        text: {
          primary: '#e2e8f0',
          secondary: '#8b95a1',
          muted: '#5a6472',
          accent: '#60a5fa',
        },
        status: {
          healthy: '#22c55e',
          active: '#3b82f6',
          awaiting: '#f59e0b',
          blocked: '#ef4444',
          judgment: '#a855f7',
          pending: '#6b7280',
          completed: '#22c55e',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
