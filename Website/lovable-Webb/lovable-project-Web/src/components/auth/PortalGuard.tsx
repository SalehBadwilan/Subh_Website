/**
 * PortalGuard — wraps a portal's content and enforces role access on the client.
 *
 * Pass the role slugs allowed into this portal. While the check runs it shows a
 * spinner; if the signed-in user's role doesn't fit AND they have no other
 * portal to be sent to, it renders a clear "access denied" screen. Users with a
 * different portal are redirected there by the hook (never shown this screen).
 *
 * The backend re-checks every API call, so this is purely the UX layer that
 * keeps employees out of the owner/admin sections (and vice-versa).
 */
import { Link } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { clearAuth, useRequireRoles } from "@/lib/auth";

export function PortalGuard({ roles, children }: { roles: string[]; children: ReactNode }) {
  const status = useRequireRoles(roles);

  if (status === "checking") {
    return (
      <div className="grid min-h-dvh place-items-center bg-muted/30 px-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          جارٍ التحقق من الصلاحية…
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="grid min-h-dvh place-items-center bg-muted/30 px-4">
        <div className="max-w-sm rounded-3xl border border-border bg-card p-8 text-center">
          <BrandMark className="mx-auto h-10 w-10 text-primary" />
          <ShieldAlert className="mx-auto mt-3 h-8 w-8 text-destructive" />
          <h1 className="mt-3 text-lg font-extrabold text-foreground">لا تملك صلاحية الدخول</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            هذا القسم مخصّص لأدوار محددة، وحسابك الحالي لا يملك الصلاحية للوصول إليه.
          </p>
          <div className="mt-5 grid gap-2">
            <Button asChild className="rounded-full font-bold">
              <Link to="/customer">العودة للمتجر</Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-full font-bold"
              onClick={() => {
                clearAuth();
                window.location.href = "/login";
              }}
            >
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
