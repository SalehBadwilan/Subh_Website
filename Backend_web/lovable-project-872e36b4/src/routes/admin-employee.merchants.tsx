import { createFileRoute } from "@tanstack/react-router";
import { MerchantsPage } from "./admin.merchants";

export const Route = createFileRoute("/admin-employee/merchants")({
  head: () => ({ meta: [{ title: "التجّار — موظف الإدارة" }] }),
  component: MerchantsPage,
});
