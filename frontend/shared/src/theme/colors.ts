/**
 * Design Tokens — الألوان (Material Design 3).
 * مصدرها: stitch_sobh_marketplace_ui_design/DESIGN.md
 * اللون الأساسي للعلامة: primary #0062a1، primary-container #009dff.
 */
export const colors = {
  // Primary
  primary: '#0062a1',
  'on-primary': '#ffffff',
  'primary-container': '#009dff',
  'on-primary-container': '#003257',
  'primary-fixed': '#d0e4ff',
  'primary-fixed-dim': '#9dcaff',
  'on-primary-fixed': '#001d35',
  'on-primary-fixed-variant': '#00497b',
  'inverse-primary': '#9dcaff',

  // Secondary
  secondary: '#406185',
  'on-secondary': '#ffffff',
  'secondary-container': '#b3d4ff',
  'on-secondary-container': '#3b5c80',
  'secondary-fixed': '#d1e4ff',
  'secondary-fixed-dim': '#a8c9f3',
  'on-secondary-fixed': '#001d36',
  'on-secondary-fixed-variant': '#27496c',

  // Tertiary
  tertiary: '#914c00',
  'on-tertiary': '#ffffff',
  'tertiary-container': '#e67c00',
  'on-tertiary-container': '#4d2600',
  'tertiary-fixed': '#ffdcc4',
  'tertiary-fixed-dim': '#ffb77f',
  'on-tertiary-fixed': '#2f1500',
  'on-tertiary-fixed-variant': '#6f3900',

  // Error
  error: '#ba1a1a',
  'on-error': '#ffffff',
  'error-container': '#ffdad6',
  'on-error-container': '#93000a',

  // Surfaces
  background: '#f8f9fb',
  'on-background': '#191c1e',
  surface: '#f8f9fb',
  'surface-dim': '#d9dadc',
  'surface-bright': '#f8f9fb',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#f2f4f6',
  'surface-container': '#edeef0',
  'surface-container-high': '#e7e8ea',
  'surface-container-highest': '#e1e2e4',
  'on-surface': '#191c1e',
  'on-surface-variant': '#3f4752',
  'surface-variant': '#e1e2e4',
  'surface-tint': '#0062a1',

  // Inverse
  'inverse-surface': '#2e3132',
  'inverse-on-surface': '#f0f1f3',

  // Outline
  outline: '#6f7884',
  'outline-variant': '#bfc7d4',

  // روابط قصيرة للتوافق مع الكود القديم
  surface_white: '#ffffff',
  textPrimary: '#191c1e',
  textSecondary: '#3f4752',
  textMuted: '#6f7884',
  border: '#bfc7d4',
  borderStrong: '#6f7884',
  overlay: 'rgba(46, 49, 50, 0.5)',
} as const;

export type Tone = 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface';

/** خريطة النغمة → لون افتراضي. */
export const toneToColor: Record<Tone, string> = {
  primary: colors.primary,
  secondary: colors.secondary,
  tertiary: colors.tertiary,
  error: colors.error,
  surface: colors.surface,
};
