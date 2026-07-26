import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "./admin.index";

export const Route = createFileRoute("/admin-employee/")({
  head: () => ({ meta: [{ title: "لوحة موظف الإدارة — صبح" }] }),
  component: AdminDashboard,
});
