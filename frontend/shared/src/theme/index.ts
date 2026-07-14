import { colors } from './colors';
import { typography } from './typography';
import { spacing, radius, shadow, breakpoints, zIndex, containerMaxWidth } from './spacing';

export * from './colors';
export * from './typography';
export * from './spacing';

/** الحزمة الكاملة للـ tokens — تُستورد دفعة واحدة. */
export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadow,
  breakpoints,
  zIndex,
  containerMaxWidth,
} as const;
