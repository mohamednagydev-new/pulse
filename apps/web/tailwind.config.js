/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // `brand.pink` keeps its key (used across the app) but is now the energetic
        // orange primary — a unisex, motivational "energy" color.
        brand: {
          pink: '#F97316',
          blue: '#2563EB',
          green: '#16A34A',
          teal: '#0D9488',
          red: '#E11D48',
          yellow: '#F59E0B',
        },
        // Remap the whole `pink` scale (used in gradients like from-brand-pink to-pink-500).
        pink: {
          100: '#FFEDD5',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        ink: '#161513',
      },
      fontFamily: {
        sans: ['Sora', 'Tajawal', 'system-ui', '-apple-system', 'sans-serif'],
        arabic: ['Tajawal', 'Sora', 'sans-serif'],
        display: ['Sora', 'Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
