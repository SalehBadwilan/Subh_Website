/**
 * مخزن الجلسة (Zustand) — يعادل src/lib/auth.ts في الويب.
 *
 * التوكن وبيانات المستخدم الكاملة (roles + merchant_id) تُخزَّن معًا في
 * SecureStore حتى يعمل حارس بوابة التاجر وتوجيه ما بعد الدخول بلا أي نداء
 * شبكة إضافي — الباك إند يُرجعهما جاهزين ضمن استجابة verify-otp نفسها.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, deleteSecureItem, getSecureItem, setSecureItem } from "./storage";
import type { AuthUser } from "@/shared";

const PHONE_KEY = "subh.auth.phone";
const ONBOARDING_KEY = "subh.onboarding.seen";

type AuthStatus = "loading" | "guest" | "authenticated";

type AuthState = {
  status: AuthStatus;
  token: string | null;
  user: AuthUser | null;
  /** بصيغة +9665XXXXXXXX — تُحفَظ مؤقتًا بين شاشتي الدخول والتحقق. */
  phone: string | null;
  /** يظهر فقط في وضع التطوير (لا مزوّد SMS بعد) — مساعد اختبار، غير مخزَّن دائمًا. */
  devOtp: string | null;
  onboardingSeen: boolean;

  hydrate: () => Promise<void>;
  setPhone: (phone: string) => void;
  setDevOtp: (code: string | null) => void;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  token: null,
  user: null,
  phone: null,
  devOtp: null,
  onboardingSeen: false,

  hydrate: async () => {
    const [token, userRaw, phone, seen] = await Promise.all([
      getSecureItem(AUTH_TOKEN_KEY),
      getSecureItem(AUTH_USER_KEY),
      getSecureItem(PHONE_KEY),
      AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null),
    ]);
    let user: AuthUser | null = null;
    if (token && userRaw) {
      try {
        user = JSON.parse(userRaw) as AuthUser;
      } catch {
        user = null;
      }
    }
    set({
      status: token && user ? "authenticated" : "guest",
      token: token && user ? token : null,
      user,
      phone: phone ?? null,
      onboardingSeen: seen === "1",
    });
  },

  setPhone: (phone) => {
    set({ phone });
    void setSecureItem(PHONE_KEY, phone);
  },

  setDevOtp: (code) => set({ devOtp: code }),

  signIn: async (token, user) => {
    await Promise.all([setSecureItem(AUTH_TOKEN_KEY, token), setSecureItem(AUTH_USER_KEY, JSON.stringify(user))]);
    set({ status: "authenticated", token, user, devOtp: null });
  },

  updateUser: async (user) => {
    await setSecureItem(AUTH_USER_KEY, JSON.stringify(user));
    set({ user });
  },

  signOut: async () => {
    await Promise.all([
      deleteSecureItem(AUTH_TOKEN_KEY),
      deleteSecureItem(AUTH_USER_KEY),
      deleteSecureItem(PHONE_KEY),
    ]);
    set({ status: "guest", token: null, user: null, phone: null, onboardingSeen: get().onboardingSeen });
  },

  markOnboardingSeen: async () => {
    set({ onboardingSeen: true });
    await AsyncStorage.setItem(ONBOARDING_KEY, "1").catch(() => undefined);
  },
}));

/** بوابة التاجر مقابل بوابة العميل — التاجر فقط له بوابة مرتفعة على الموبايل. */
export function portalFor(roles?: string[] | null): "merchant" | "customer" {
  return (roles ?? []).includes("merchant") ? "merchant" : "customer";
}
