import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminEmployeeShell } from "@/components/admin-employee/AdminEmployeeShell";
import { AdminRoleProvider } from "@/lib/admin-role";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/admin-employee")({
  head: () => ({
    meta: [
      { title: "لوحة موظف الإدارة — صبح" },
      {
        name: "description",
        content:
          "لوحة موظف الإدارة في صبح: مراجعة طلبات التجّار، عرض التجّار والعملاء والمنتجات والتقارير.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminEmployeeLayout,
});

function AdminEmployeeLayout() {
  return (
    <>
      <AdminRoleProvider role="employee">
        <AdminEmployeeShell>
          <Outlet />
        </AdminEmployeeShell>
      </AdminRoleProvider>
      <Toaster position="top-center" richColors />
    </>
  );
}
