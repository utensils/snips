/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-family-base)',
          'Cantarell',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.1', fontWeight: '400' }],
        sm: ['0.875rem', { lineHeight: '1.3', fontWeight: '400' }],
        base: ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        lg: ['1.125rem', { lineHeight: '1.5', fontWeight: '500' }],
        xl: ['1.25rem', { lineHeight: '1.6', fontWeight: '600' }],
        '2xl': ['1.5rem', { lineHeight: '1.6', fontWeight: '600' }],
      },
      spacing: {
        '1': '0.5rem',
        '1.5': '0.75rem',
        '2': '1rem',
        '2.5': '1.25rem',
        '3': '1.5rem',
        '3.5': '1.75rem',
        '4': '2rem',
        '5': '2.5rem',
        '6': '3rem',
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        border: 'var(--border)',
        'border-soft': 'var(--border-soft)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        icon: 'var(--icon-theme)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
