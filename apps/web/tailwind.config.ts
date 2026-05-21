import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          500: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
      },
      // Custom backgrounds for the marketing site. Defined here so Tailwind
      // is guaranteed to compile them — no separate CSS file involved.
      backgroundImage: {
        'hero-radial':
          'radial-gradient(60% 40% at 50% 0%, rgba(37, 99, 235, 0.45) 0%, rgba(37, 99, 235, 0) 70%), radial-gradient(45% 35% at 85% 15%, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0) 75%), radial-gradient(45% 40% at 15% 60%, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0) 75%)',
        'hero-grid':
          'linear-gradient(rgba(148, 163, 184, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px)',
        'dotted-slate':
          'radial-gradient(rgba(15, 23, 42, 0.08) 1px, transparent 1px)',
      },
      backgroundSize: {
        'hero-grid': '56px 56px',
        'dotted-slate': '18px 18px',
      },
      keyframes: {
        'rest-marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'rest-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'rest-ping-soft': {
          '0%': { transform: 'scale(0.9)', opacity: '0.8' },
          '70%': { transform: 'scale(1.7)', opacity: '0' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'rest-marquee': 'rest-marquee 36s linear infinite',
        'rest-float': 'rest-float 6s ease-in-out infinite',
        'rest-ping': 'rest-ping-soft 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
