/**
 * مخزن السلّة (Zustand + AsyncStorage) — يعادل src/lib/cart-context.tsx في الويب.
 *
 * تُخزَّن لقطة المنتج الكاملة (وليس المعرّف فقط) داخل كل سطر — لأن منتجات
 * الباك إند الحقيقي لا وجود لها في أي قائمة محلية يمكن الاشتقاق منها لاحقًا
 * (بخلاف بيانات الـ Mock القديمة). هذا يطابق الإصلاح الذي طُبِّق على سلّة
 * الويب لنفس السبب بالضبط.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartLine, Product } from "@/shared";

type CartState = {
  lines: CartLine[];
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      addItem: (product, qty = 1) => {
        const lines = [...get().lines];
        const existing = lines.find((l) => l.product.id === product.id);
        if (existing) {
          existing.qty += qty;
        } else {
          lines.push({ product, qty });
        }
        set({ lines });
      },

      removeItem: (productId) => {
        set({ lines: get().lines.filter((l) => l.product.id !== productId) });
      },

      setQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          lines: get().lines.map((l) => (l.product.id === productId ? { ...l, qty } : l)),
        });
      },

      clear: () => set({ lines: [] }),
    }),
    {
      name: "subh.cart",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** عدد القطع الكلي (لشارة تبويب السلّة) */
export function useCartCount(): number {
  return useCartStore((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));
}

/** أسطر السلّة ببيانات المنتج الكاملة (مباشرة من التخزين، بلا اشتقاق). */
export function useCartLines(): CartLine[] {
  return useCartStore((s) => s.lines);
}

/** المجموع الفرعي */
export function useCartSubtotal(): number {
  return useCartLines().reduce((sum, l) => sum + l.product.price * l.qty, 0);
}
