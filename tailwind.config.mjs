/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FCFBF9',
          100: '#FAF8F5',
          200: '#F4F0E8',
          300: '#EAE4D6',
        },
        warm: {
          50: '#FAF8F5',
          100: '#F5F2EB',
          200: '#EBE5D8',
          300: '#DDD5C3',
          800: '#2C2723',
          900: '#1C1917',
        },
        ink: {
          900: '#1C1917',
          800: '#292524',
          700: '#44403C',
          600: '#57534E',
          500: '#78716C',
          400: '#A8A29E',
          300: '#D6D3D1',
          200: '#E7E5E4',
          100: '#F5F5F4',
        },
        // Restrained burnt-orange terracotta accent
        brand: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          500: '#F97316',
          600: '#C2410C', // Primary action burnt orange
          700: '#9A3412', // Hover
          800: '#7C2D12',
          900: '#431407',
        },
        // Outdated / Conflict red
        conflict: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
        },
        // Pending Review amber
        review: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
        },
        // Matches official details green
        current: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Playfair Display', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'xs': '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
