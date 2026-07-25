import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppText } from "./ui/AppText";
import { colors, font, radius } from "@/lib/theme";
import { OTP_LENGTH } from "@/shared";

type Props = {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
};

/**
 * حقل رمز التحقق: 6 خانات مرئية فوق حقل إدخال مخفي واحد —
 * نفس شكل InputOTP في الويب. الخانات تُعرض LTR (كما في الويب dir="ltr").
 */
export function OtpInput({ value, onChange, disabled, error }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
  const activeIndex = Math.min(digits.length, OTP_LENGTH - 1);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityLabel="رمز التحقق المكوّن من 6 أرقام"
      style={styles.wrap}
    >
      <View style={styles.row}>
        {Array.from({ length: OTP_LENGTH }).map((_, i) => {
          const isActive = focused && i === activeIndex && !disabled;
          return (
            <View
              key={i}
              style={[
                styles.box,
                error && { borderColor: colors.destructive },
                isActive && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            >
              <AppText weight="bold" size={20} center ltr style={styles.digit}>
                {digits[i] ?? ""}
              </AppText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={digits}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, OTP_LENGTH))}
        editable={!disabled}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
        caretHidden
        autoFocus
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
  },
  row: {
    // الخانات LTR: الرقم الأول في أقصى اليسار — نفس الويب
    flexDirection: "row",
    gap: 8,
  },
  box: {
    width: 46,
    height: 54,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: {
    fontFamily: font.bold,
  },
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: "transparent",
  },
});
