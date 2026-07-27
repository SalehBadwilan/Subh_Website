import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/auth/AuthLayout";
import { getUser } from "@/lib/auth";

export const Route = createFileRoute("/role-redirect")({
  head: () => ({
    meta: [
      { title: "جارٍ التحقق من الحساب — صبح" },
      { name: "description", content: "جارٍ التحقق من الحساب وتوجيهك إلى لوحتك." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoleRedirectPage,
});

function RoleRedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = getUser();
    const roles = user?.roles ?? [];

    if (roles.includes("admin")) {
      navigate({ to: "/admin", replace: true });
    } else if (roles.includes("warehouse")) {
      navigate({ to: "/operations", replace: true });
    } else if (roles.includes("admin_employee")) {
      navigate({ to: "/admin-employee", replace: true });
    } else if (roles.includes("merchant_employee")) {
      navigate({ to: "/merchant-employee", replace: true });
    } else if (roles.includes("merchant")) {
      navigate({ to: "/merchant", replace: true });
    } else {
      navigate({ to: "/customer", replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <BrandMark className="h-14 w-14 text-primary" />

        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          جارٍ التحقق من الحساب...
        </div>

        <p className="max-w-xs text-xs text-muted-foreground">
          سيتم توجيهك تلقائيًا إلى لوحتك المناسبة خلال لحظات.
        </p>
      </div>
    </div>
  );
}
