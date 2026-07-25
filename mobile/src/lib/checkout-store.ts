/**
 * حالة إتمام الشراء (Zustand، بلا حفظ دائم) — تربط خطوات
 * عنوان → مراجعة → دفع → نجاح ببعضها دون تمرير بيانات عبر router params.
 * تُصفَّر بعد نجاح الدفع أو عند مغادرة التدفّق من البداية.
 */
import { create } from "zustand";
import type { ApiAddress, ApiOrder } from "@/shared";

type CheckoutState = {
  address: ApiAddress | null;
  order: ApiOrder | null;
  setAddress: (address: ApiAddress) => void;
  setOrder: (order: ApiOrder) => void;
  reset: () => void;
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  address: null,
  order: null,
  setAddress: (address) => set({ address, order: null }),
  setOrder: (order) => set({ order }),
  reset: () => set({ address: null, order: null }),
}));
