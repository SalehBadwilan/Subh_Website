import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./ui/AppText";
import { colors, radius } from "@/lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  /** أيقونة Ionicons صغيرة داخل مربع ملوّن بجانب العنوان */
  icon?: keyof typeof Ionicons.glyphMap;
  /** لون مميز للعروض (destructive) بدل الأساسي */
  accent?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

/** ترويسة قسم — تعادل SectionHeader في رئيسية الويب */
export function SectionHeader({ title, subtitle, icon, accent, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <View style={styles.titleRow}>
          {icon ? (
            <View
              style={[
                styles.iconTile,
                { backgroundColor: accent ? colors.destructiveSoft : colors.primarySoft },
              ]}
            >
              <Ionicons
                name={icon}
                size={15}
                color={accent ? colors.destructive : colors.primary}
              />
            </View>
          ) : null}
          <AppText weight="extrabold" size={17}>
            {title}
          </AppText>
        </View>
        {subtitle ? (
          <AppText size={11.5} color={colors.mutedForeground}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.action} accessibilityRole="button">
          <AppText weight="semibold" size={12.5} color={colors.primary}>
            {actionLabel}
          </AppText>
          <Ionicons name="chevron-back" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  titleWrap: {
    gap: 2,
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  action: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
  },
});
