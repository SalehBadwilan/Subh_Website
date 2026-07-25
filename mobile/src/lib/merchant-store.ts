/**
 * حالة حساب التاجر الفعلية (Zustand) — يستدعي `GET /merchant/profile` عند
 * دخول بوابة `(merchant)` ليُميّز بين: لا حساب تاجر بعد، موقوف، ملغى، أو
 * جاهز. هذا مختلف عن دور المستخدم (roles تصل من verify-otp) — الدور يحدّد
 * إن كانت البوابة مسموحة أصلًا، وهذا المتجر يحدّد حالة الحساب داخلها.
 */
import { create } from "zustand";
import { getMerchantProfile, type ApiMerchant } from "@/shared";

export type MerchantStatus = "loading" | "ready" | "none" | "suspended" | "terminated" | "error";

type MerchantState = {
  status: MerchantStatus;
  merchant: ApiMerchant | null;
  load: () => Promise<void>;
  reset: () => void;
};

export const useMerchantStore = create<MerchantState>((set) => ({
  status: "loading",
  merchant: null,

  load: async () => {
    set({ status: "loading" });
    const res = await getMerchantProfile();
    if (!res.ok) {
      const status: MerchantStatus =
        res.code === "not_merchant"
          ? "none"
          : res.code === "merchant_suspended"
            ? "suspended"
            : res.code === "merchant_terminated"
              ? "terminated"
              : "error";
      set({ status, merchant: null });
      return;
    }
    set({ status: "ready", merchant: res.data.merchant });
  },

  reset: () => set({ status: "loading", merchant: null }),
}));
