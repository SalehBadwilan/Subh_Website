import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "./admin.users";

export const Route = createFileRoute("/admin-employee/users")({
  head: () => ({ meta: [{ title: "المستخدمون — موظف الإدارة" }] }),
  component: UsersPage,
});
