import { createFileRoute } from "@tanstack/react-router";
import { ApplicationsPage } from "./admin.applications";

export const Route = createFileRoute("/admin-employee/applications")({
  head: () => ({ meta: [{ title: "طلبات التجّار — موظف الإدارة" }] }),
  component: ApplicationsPage,
});
