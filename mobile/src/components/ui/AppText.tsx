import { Text, type TextProps } from "react-native";
import { colors, font, type FontWeightKey } from "@/lib/theme";

type Props = TextProps & {
  weight?: FontWeightKey;
  color?: string;
  size?: number;
  /** توسيط النص (الافتراضي: محاذاة يمين لأن التطبيق عربي RTL) */
  center?: boolean;
  /** للنصوص اللاتينية/الأرقام (رقم جوال، رمز، سعر) حتى لا تنقلب داخل RTL */
  ltr?: boolean;
};

/**
 * بديل <Text> الموحّد: خط Cairo + محاذاة يمين افتراضيًا.
 * استخدمه دائمًا بدل Text حتى تبقى الخطوط والاتجاه متسقة مع هوية الويب.
 */
export function AppText({
  weight = "regular",
  color = colors.foreground,
  size = 14,
  center,
  ltr,
  style,
  ...rest
}: Props) {
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: font[weight],
          color,
          fontSize: size,
          lineHeight: Math.round(size * 1.65),
          textAlign: center ? "center" : "right",
          writingDirection: ltr ? "ltr" : "rtl",
        },
        style,
      ]}
    />
  );
}
