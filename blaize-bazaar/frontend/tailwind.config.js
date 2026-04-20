import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Storefront palette (storefront.md - cream/ink/terracotta).
        'cream': '#fbf4e8',
        'cream-warm': '#f5e8d3',
        'ink': '#2d1810',
        'ink-soft': '#6b4a35',
        'ink-quiet': '#a68668',
        'accent': '#c44536',
        'dusk': '#3d2518',

        // Theme-aware via CSS variables
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'text-primary': 'var(--text-primary, #f5f5f7)',
        'text-secondary': 'var(--text-secondary, #a1a1a6)',
        'text-tertiary': 'var(--text-tertiary, #636366)',
        'border-subtle': 'var(--border-color, rgba(255, 255, 255, 0.08))',

        // Apple blue links
        'apple-blue': 'var(--link-color, #0071e3)',

        // Utility
        'success': '#4ade80',
        'warning': '#fbbf24',

        // Warm-tinted hairline (ink-soft at 8% alpha). Used as card border
        // and hero-ticker top divider for premium warm depth.
        'warm': 'rgba(107, 74, 53, 0.08)',
      },
      borderColor: {
        'cream': '#fbf4e8',
        'cream-warm': '#f5e8d3',
        'ink': '#2d1810',
        'ink-soft': '#6b4a35',
        'ink-quiet': '#a68668',
        'accent': '#c44536',
        'dusk': '#3d2518',
        'warm': 'rgba(107, 74, 53, 0.08)',
      },
      boxShadow: {
        // Warm-tinted shadows (ink-soft at low alpha) — the single biggest
        // contributor to the storefront "premium feel" vs cold grey drops.
        'warm':
          '0 2px 8px rgba(107, 74, 53, 0.06), 0 1px 3px rgba(107, 74, 53, 0.04)',
        'warm-lg':
          '0 8px 24px rgba(107, 74, 53, 0.10), 0 4px 8px rgba(107, 74, 53, 0.06)',
      },
      fontWeight: {
        'light': '300',
        'normal': '400',
        'medium': '500',
      },
      backdropBlur: {
        'xs': '2px',
        'xl': '30px',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.6s ease-in-out forwards',
        'slideUp': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulse 2s infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
