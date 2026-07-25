import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type CartLine, type Product } from "@/lib/customer-data";

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  addItem: (product: Product, qty?: number) => void;
  updateQty: (productId: string, delta: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = "subh:cart";

type StoredLine = CartLine;

function loadCartFromStorage(): CartLine[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed as CartLine[];
  } catch {
    return [];
  }
}

function saveCartToStorage(lines: CartLine[]): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadCartFromStorage);
  const isFirstRun = useRef(true);

  // Persist cart across auth navigations (login → verify → back to checkout).
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    saveCartToStorage(lines);
  }, [lines]);

  const addItem = useCallback((product: Product, qty: number = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, qty: l.qty + qty } : l,
        );
      }
      return [...prev, { product, qty }];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, qty } : l))
        .filter((l) => l.qty > 0),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    return { lines, count, subtotal, addItem, updateQty, setQty, removeItem, clear };
  }, [lines, addItem, updateQty, setQty, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
