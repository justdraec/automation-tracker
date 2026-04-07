import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--app-bg)',
          surface: 'var(--surface)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
          hover: 'var(--border-hover)',
        },
        text: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          hint: 'var(--text-hint)',
        },
        step1: {
          DEFAULT: 'var(--step1-accent)',
          text: 'var(--step1-text)',
          bg: 'var(--step1-bg)',
          border: 'var(--step1-border)',
        },
        step2: {
          DEFAULT: 'var(--step2-accent)',
          text: 'var(--step2-text)',
          bg: 'var(--step2-bg)',
          border: 'var(--step2-border)',
        },
        step3: {
          DEFAULT: 'var(--step3-accent)',
          text: 'var(--step3-text)',
          bg: 'var(--step3-bg)',
          border: 'var(--step3-border)',
        },
        ai: {
          DEFAULT: 'var(--ai-text)',
          bg: 'var(--ai-bg)',
          border: 'var(--ai-border)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg: 'var(--danger-bg)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        btn: '9px',
        pill: '20px',
      },
    },
  },
  plugins: [],
} satisfies Config
