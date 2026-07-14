/**
 * Design Tokens — الخطوط (Material Design 3).
 * الخط: IBM Plex Sans Arabic.
 */
export const typography = {
  fontFamily: {
    /** خط أساسي لكل النصوص. */
    sans: 'var(--font-ibm-plex)', // IBM Plex Sans Arabic
    heading: 'var(--font-ibm-plex)',
    mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  },
  // Type scale من DESIGN.md
  fontSize: {
    'display-lg': '40px',
    'headline-lg': '32px',
    'title-md': '20px',
    'body-lg': '18px',
    'body-md': '16px',
    'label-sm': '13px',
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    'display-lg': '56px',
    'headline-lg': '44px',
    'title-md': '28px',
    'body-lg': '28px',
    'body-md': '24px',
    'label-sm': '18px',
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
    'label-sm': '0.02em',
  },
} as const;

export type FontSizeKey = keyof typeof typography.fontSize;
