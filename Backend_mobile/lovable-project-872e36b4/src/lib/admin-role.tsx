import { createContext, useContext, type ReactNode } from "react";

export type AdminRole = "admin" | "employee";

const AdminRoleContext = createContext<AdminRole>("admin");

export function AdminRoleProvider({
  role,
  children,
}: {
  role: AdminRole;
  children: ReactNode;
}) {
  return (
    <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>
  );
}

export function useAdminRole(): AdminRole {
  return useContext(AdminRoleContext);
}

export function useCanManage(): boolean {
  return useContext(AdminRoleContext) === "admin";
}
