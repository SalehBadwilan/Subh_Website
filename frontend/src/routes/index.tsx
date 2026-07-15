import { createFileRoute, redirect } from "@tanstack/react-router";

// Guests should be able to browse the storefront without signing in.
// Protected actions (checkout, orders, addresses) enforce auth themselves.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/customer" });
  },
});
