import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { AppText } from "./AppText";
import { colors, radius } from "@/lib/theme";

type Variant = "primary" | "outline" | "soft" | "ghost" | "destructive" | "white";
type Size = "lg" | "md" | "sm";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  /** نص بديل يظهر أثناء التحميل (مثل «جارٍ الإرسال…») */
  loadingTitle?: string;
  /** أيقونة تُعرض قبل النص */
  icon?: ReactNode;
  style?: ViewStyle;
};

const HEIGHTS: Record<Size, number> = { lg: 48, md: 42, sm: 36 };
const TEXT_SIZES: Record<Size, number> = { lg: 16, md: 14, sm: 13 };

/** زر موحّد بنفس أسلوب أزرار الويب (rounded-xl · font-bold) */
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  disabled,
  loading,
  loadingTitle,
  icon,
  style,
}: Props) {
  const isDisabled = disabled || loading;

  const background: Record<Variant, string> = {
    primary: colors.primary,
    destructive: colors.destructive,
    soft: colors.primarySoft,
    outline: "transparent",
    ghost: "transparent",
    white: colors.background,
  };
  const textColor: Record<Variant, string> = {
    primary: colors.primaryForeground,
    destructive: colors.destructiveForeground,
    soft: colors.accentForeground,
    outline: colors.foreground,
    ghost: colors.primary,
    white: colors.primary,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHTS[size],
          backgroundColor: background[variant],
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: colors.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor[variant]} />
      ) : (
        icon
      )}
      <AppText weight="bold" size={TEXT_SIZES[size]} color={textColor[variant]} center>
        {loading && loadingTitle ? loadingTitle : title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.xl,
    paddingHorizontal: 20,
  },
});
