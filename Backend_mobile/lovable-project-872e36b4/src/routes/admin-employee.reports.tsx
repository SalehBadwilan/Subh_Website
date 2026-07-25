import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "./admin.reports";

export const Route = createFileRoute("/admin-employee/reports")({
  head: () => ({ meta: [{ title: "التقارير — موظف الإدارة" }] }),
  component: ReportsPage,
});
