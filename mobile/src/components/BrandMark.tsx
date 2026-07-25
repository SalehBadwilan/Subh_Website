import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "@/lib/theme";

/**
 * شعار «صبح» — نفس شعار الويب (BrandMark في AuthLayout.tsx):
 * شروق شمس مجرّد داخل مربع دائري الحواف.
 */
export function BrandMark({ size = 36, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect width={48} height={48} rx={12} fill={color} opacity={0.12} />
      <Path d="M12 30c0-9.94 8.06-18 18-18v6a12 12 0 0 0-12 12h-6Z" fill={color} />
      <Circle cx={34} cy={30} r={4} fill={color} />
    </Svg>
  );
}
