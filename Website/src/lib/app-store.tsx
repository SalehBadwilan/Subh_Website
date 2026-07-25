import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addresses as initialAddresses,
  notifications as initialNotifications,
  opsToBaseStatus,
  type Address,
  type Notification,
  type OpsOrderStatus,
  type Order,
  type PaymentMethodKey,
  type Product,
} from "@/lib/customer-data";

type NewOrderInput = {
  items: { product: Product; qty: number }[];
  total: number;
  delivery?: Address;
  payment?: PaymentMethodKey;
};

type AddressInput = Omit<Address, "id" | "isDefault">;

type AppStoreValue = {
  // orders
  orders: Order[];
  addOrder: (input: NewOrderInput) => Order;
  getOrderById: (id: string) => Order | undefined;
  updateOrderOpsStatus: (id: string, opsStatus: OpsOrderStatus) => void;

  // notifications
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "time" | "unread">) => void;
  markAllRead: () => void;

  // addresses
  addresses: Address[];
  addAddress: (input: AddressInput) => Address;
  updateAddress: (id: string, input: AddressInput) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
};

const AppStoreContext = createContext<AppStoreValue | null>(null);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextOrderId(existing: Order[]): string {
  const nums = existing
    .map((o) => Number(o.id.replace(/[^\d]/g, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 10000;
  return `SUBH-${max + 1}`;
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  // Orders start empty — a newly registered customer sees an empty state
  // until they place an order during the current session.
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(() => [
    ...initialNotifications,
  ]);
  const [addresses, setAddresses] = useState<Address[]>(() => [
    ...initialAddresses,
  ]);

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "time" | "unread">) => {
      setNotifications((prev) => [
        {
          ...n,
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          time: "الآن",
          unread: true,
        },
        ...prev,
      ]);
    },
    [],
  );

  const addOrder = useCallback((input: NewOrderInput): Order => {
    let created: Order | undefined;
    setOrders((prev) => {
      const id = nextOrderId(prev);
      const itemCount = input.items.reduce((s, l) => s + l.qty, 0);
      created = {
        id,
        date: todayIso(),
        status: "processing",
        opsStatus: "new",
        total: input.total,
        itemCount,
        items: input.items.map((l) => ({ product: l.product, qty: l.qty })),
        delivery: input.delivery,
        payment: input.payment,
      };
      return [created, ...prev];
    });
    return created as Order;
  }, []);

  const getOrderById = useCallback(
    (id: string) => orders.find((o) => o.id === id),
    [orders],
  );

  const updateOrderOpsStatus = useCallback(
    (id: string, opsStatus: OpsOrderStatus) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, opsStatus, status: opsToBaseStatus(opsStatus) }
            : o,
        ),
      );
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const addAddress = useCallback((input: AddressInput): Address => {
    const created: Address = {
      ...input,
      id: `a-${Date.now()}`,
    };
    setAddresses((prev) => {
      if (prev.length === 0) return [{ ...created, isDefault: true }];
      return [...prev, created];
    });
    return created;
  }, []);

  const updateAddress = useCallback((id: string, input: AddressInput) => {
    setAddresses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...input } : a)),
    );
  }, []);

  const removeAddress = useCallback((id: string) => {
    setAddresses((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      if (
        prev.find((a) => a.id === id)?.isDefault &&
        filtered.length > 0 &&
        !filtered.some((a) => a.isDefault)
      ) {
        filtered[0] = { ...filtered[0], isDefault: true };
      }
      return filtered;
    });
  }, []);

  const setDefaultAddress = useCallback((id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id })),
    );
  }, []);

  const value = useMemo<AppStoreValue>(() => {
    const unreadCount = notifications.filter((n) => n.unread).length;
    return {
      orders,
      addOrder,
      getOrderById,
      updateOrderOpsStatus,
      notifications,
      unreadCount,
      addNotification,
      markAllRead,
      addresses,
      addAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
    };
  }, [
    orders,
    addOrder,
    getOrderById,
    updateOrderOpsStatus,
    notifications,
    addNotification,
    markAllRead,
    addresses,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
  ]);

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
