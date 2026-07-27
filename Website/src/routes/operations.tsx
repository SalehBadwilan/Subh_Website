import { createFileRoute, Outlet } from "@tanstack/react-router";
import { OperationsShell } from "@/components/operations/OperationsShell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/operations")({
  head: () => ({
    meta: [
      { title: "لوحة العمليات — صبح" },
      {
        name: "description",
        content: "لوحة موظف العمليات في منصة صبح: الطلبات، المخزون، الشحنات والتقارير التشغيلية.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OperationsLayout,
});

function OperationsLayout() {
  return (
    <>
      <OperationsShell>
        <Outlet />
      </OperationsShell>
      <Toaster position="top-center" richColors />
    </>
  );
}
