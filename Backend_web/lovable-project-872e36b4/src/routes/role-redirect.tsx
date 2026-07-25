import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/auth/AuthLayout";

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
    const t = setTimeout(() => {
      navigate({ to: "/customer", replace: true });
    }, 2500);
    return () => clearTimeout(t);
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
