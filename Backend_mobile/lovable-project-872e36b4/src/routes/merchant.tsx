import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MerchantShell } from "@/components/merchant/MerchantShell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/merchant")({
  head: () => ({
    meta: [
      { title: "لوحة التاجر — صبح" },
      {
        name: "description",
        content: "لوحة تحكم التاجر في منصة صبح: طلبات، منتجات، مخزون، ومبيعات.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MerchantLayout,
});

function MerchantLayout() {
  return (
    <>
      <MerchantShell>
        <Outlet />
      </MerchantShell>
      <Toaster position="top-center" richColors />
    </>
  );
}
