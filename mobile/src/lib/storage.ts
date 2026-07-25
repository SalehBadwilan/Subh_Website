/**
 * تخزين الجلسة حسب خطة الـ Frontend: SecureStore للموبايل
 * (التوكن لا يُخزَّن في مكان مكشوف)، مع بديل localStorage على الويب
 * لأن expo-secure-store غير مدعوم في المتصفح.
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * مفاتيح جلسة المصادقة — مُصدَّرة من هنا (وليس من auth-store.ts) حتى تتمكّن
 * طبقة shared/api.ts من قراءة التوكن لكل طلب دون استيراد دائري
 * (api.ts → auth-store.ts → shared/index.ts → api.ts).
 */
export const AUTH_TOKEN_KEY = "subh.auth.token";
export const AUTH_USER_KEY = "subh.auth.user";

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* ignore */
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}
