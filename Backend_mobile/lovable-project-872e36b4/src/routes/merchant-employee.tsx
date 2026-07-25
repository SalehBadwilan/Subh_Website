import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MerchantEmployeeShell } from "@/components/merchant-employee/MerchantEmployeeShell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/merchant-employee")({
  head: () => ({
    meta: [
      { title: "لوحة موظف التاجر — صبح" },
      {
        name: "description",
        content:
          "لوحة موظف التاجر في منصة صبح: الطلبات المسندة، المنتجات، المخزون، والتقارير.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MerchantEmployeeLayout,
});

function MerchantEmployeeLayout() {
  return (
    <>
      <MerchantEmployeeShell>
        <Outlet />
      </MerchantEmployeeShell>
      <Toaster position="top-center" richColors />
    </>
  );
}
