import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { CartProvider } from "@/lib/cart-context";
import { Toaster } from "@/components/ui/sonner";

/**
 * Customer layout route. Wraps every /customer/* page with the shared
 * header + mobile bottom nav and a shared cart context so cart state
 * stays in sync across product, cart, checkout and the header badge.
 * The AppStoreProvider is mounted at the root so orders/notifications
 * stay in sync across customer, merchant, admin and operations modules.
 */
export const Route = createFileRoute("/customer")({
  head: () => ({
    meta: [
      { title: "صبح — تسوّق من المنصة المركزية" },
      {
        name: "description",
        content:
          "صبح: منصة تسوّق مركزية توفّر لك منتجات مختارة وأسعار موحّدة وتوصيل سريع لجميع مدن المملكة.",
      },
      { property: "og:title", content: "صبح — تسوّق من المنصة المركزية" },
      {
        property: "og:description",
        content:
          "صبح: منصة تسوّق مركزية توفّر لك منتجات مختارة وأسعار موحّدة وتوصيل سريع.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CustomerLayout,
});

function CustomerLayout() {
  return (
    <CartProvider>
      <CustomerShell>
        <Outlet />
      </CustomerShell>
      <Toaster position="top-center" richColors />
    </CartProvider>
  );
}

