import { createContext, useContext, type ReactNode } from "react";

export type AdminRole = "admin" | "employee";

export type AdminPermission =
  | "dashboard"
  | "users"
  | "merchants"
  | "products"
  | "categories"
  | "applications"
  | "support_tickets"
  | "reports";

type AdminContext = {
  role: AdminRole;
  permissions: AdminPermission[];
};

const AdminRoleContext = createContext<AdminContext>({
  role: "admin",
  permissions: [],
});

export function AdminRoleProvider({
  role,
  permissions,
  children,
}: {
  role: AdminRole;
  permissions: AdminPermission[];
  children: ReactNode;
}) {
  return (
    <AdminRoleContext.Provider value={{ role, permissions }}>{children}</AdminRoleContext.Provider>
  );
}

export function useAdminRole() {
  return useContext(AdminRoleContext);
}

export function useCanManage(): boolean {
  return useContext(AdminRoleContext).role === "admin";
}
export function useHasPermission(permission: AdminPermission): boolean {
  const { role, permissions } = useContext(AdminRoleContext);

  return role === "admin" || permissions.includes(permission);
}
