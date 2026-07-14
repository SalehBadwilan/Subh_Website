import type { Config } from 'tailwindcss';
// @ts-expect-error — tailwindcss-rtl لا يملك تعريفات أنواع لكنه يعمل.
import rtl from 'tailwindcss-rtl';
import { colors, radius, shadow, breakpoints } from '@sabah/shared';

/**
 * إعدادات Tailwind مبنية على Material Design 3 من التصاميم.
 * كل الألوان هنا tokens مسطحة (flat) لتعمل كـ bg-primary, text-on-surface, إلخ.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    screens: {
      sm: breakpoints.sm,
      md: breakpoints.md,
      lg: breakpoints.lg,
      xl: breakpoints.xl,
      '2xl': breakpoints['2xl'],
    },
    extend: {
      colors: {
        // كل token يصبح utility: bg-primary, text-on-surface, border-outline-variant...
        ...colors,
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-ibm-plex)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-lg': ['40px', { lineHeight: '56px', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '44px', fontWeight: '600' }],
        'title-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-sm': ['13px', { lineHeight: '18px', fontWeight: '500', letterSpacing: '0.02em' }],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        ...radius,
      },
      boxShadow: shadow,
      spacing: {
        'margin-desktop': '2rem',
        'margin-mobile': '1rem',
        gutter: '1.5rem',
        'stack-lg': '2rem',
        'stack-md': '1rem',
        'stack-sm': '0.5rem',
      },
      maxWidth: {
        'container-max': '1280px',
        container: '1280px',
      },
      zIndex: {
        dropdown: '1000',
        sticky: '1100',
        drawer: '1200',
        modal: '1300',
        toast: '1400',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-end': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-up': 'fade-up 0.6s ease-out',
        'slide-in-end': 'slide-in-end 0.3s ease-out',
      },
    },
  },
  plugins: [rtl],
} satisfies Config;

export default config;
