import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "./admin.products";

export const Route = createFileRoute("/admin-employee/products")({
  head: () => ({ meta: [{ title: "المنتجات — موظف الإدارة" }] }),
  component: ProductsPage,
});
