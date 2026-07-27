import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminEmployeeShell } from "@/components/admin-employee/AdminEmployeeShell";
import { PortalGuard } from "@/components/auth/PortalGuard";
import { AdminRoleProvider } from "@/lib/admin-role";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { getMyPermissions } from "@/lib/api-admin";

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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPermissions()
      .then((res) => setPermissions(res.permissions))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return null;
  }

  return (
    <PortalGuard roles={["admin_employee"]}>
      <AdminRoleProvider role="employee" permissions={permissions}>
        <AdminEmployeeShell>
          <Outlet />
        </AdminEmployeeShell>
      </AdminRoleProvider>

      <Toaster position="top-center" richColors />
    </PortalGuard>
  );
}
