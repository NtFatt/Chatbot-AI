import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      colors: {
        ink: '#0f1720',
        paper: '#f6f8fb',
        slate: '#e2e8f0',
        cyan: '#34c6ba',
        ocean: '#0f8b8d',
        dusk: '#0f172a',
        mist: '#f8fafc',
        line: '#d9e2ec',
      },
      boxShadow: {
        soft: '0 12px 32px rgba(15, 23, 32, 0.08)',
        subtle: '0 8px 22px rgba(15, 23, 42, 0.06)',
        floating: '0 20px 56px rgba(15, 23, 42, 0.14)',
      },
      backgroundImage: {
        'paper-glow':
          'radial-gradient(circle at top left, rgba(67, 212, 200, 0.25), transparent 32%), radial-gradient(circle at 80% 20%, rgba(12, 109, 122, 0.18), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,247,244,0.92))',
      },
    },
  },
  plugins: [],
};

export default config;
