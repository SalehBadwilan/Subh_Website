import { StyleSheet, View } from "react-native";
import { AppText } from "./ui/AppText";
import { BrandMark } from "./BrandMark";
import { colors } from "@/lib/theme";

/**
 * ترويسة شاشات المصادقة: الشعار يمينًا وعدّاد الخطوات يسارًا —
 * نفس الشريط العلوي في AuthLayout على الويب (نسخة الجوال).
 */
export function AuthHeader({ step }: { step?: { current: number; total: number } }) {
  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <BrandMark size={36} />
        <AppText weight="extrabold" size={20}>
          صبح
        </AppText>
      </View>
      {step ? (
        <AppText weight="medium" size={12} color={colors.mutedForeground} ltr>
          {step.current} / {step.total}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
});
