import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { AppText } from "./ui/AppText";
import { Button } from "./ui/Button";
import { colors, radius } from "@/lib/theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** حالة فارغة موحّدة (سلّة فارغة، لا طلبات…) — متطلب أساسي في الوثيقة */
export function EmptyState({ icon, title, body, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={34} color={colors.primary} />
      </View>
      <AppText weight="extrabold" size={18} center>
        {title}
      </AppText>
      {body ? (
        <AppText size={13} color={colors.mutedForeground} center style={{ maxWidth: 280 }}>
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} size="md" style={{ marginTop: 10, minWidth: 180 }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
});
