import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة — صبح" },
      {
        name: "description",
        content: "لوحة إدارة منصة صبح: طلبات التجّار، المنتجات، الفئات، الباقات، والتقارير.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <>
      <AdminShell>
        <Outlet />
      </AdminShell>
      <Toaster position="top-center" richColors />
    </>
  );
}
