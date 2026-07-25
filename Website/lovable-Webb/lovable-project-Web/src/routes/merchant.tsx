import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Briefcase, Loader2, RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MerchantShell } from "@/components/merchant/MerchantShell";
import { Toaster } from "@/components/ui/sonner";
import { MerchantProvider, useMerchant } from "@/lib/merchant-context";
import { PortalGuard } from "@/components/auth/PortalGuard";

export const Route = createFileRoute("/merchant")({
  head: () => ({
    meta: [
      { title: "لوحة التاجر — صبح" },
      {
        name: "description",
        content: "لوحة تحكم التاجر في منصة صبح: طلبات، منتجات، مخزون، ومبيعات.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MerchantLayout,
});

function MerchantLayout() {
  // Owner portal: only the `merchant` role. A merchant_employee is redirected by
  // the guard to /merchant-employee, so employees can never reach owner screens.
  const pathname = useRouterState({
  select: (s) => s.location.pathname,
});

const isRegister = pathname.startsWith("/merchant/register");
  return (
    <PortalGuard roles={["merchant"]}>
      <MerchantProvider>
  {isRegister ? (
    <MerchantGate>
      <Outlet />
    </MerchantGate>
  ) : (
    <MerchantShell>
      <MerchantGate>
        <Outlet />
      </MerchantGate>
    </MerchantShell>
  )}

  <Toaster position="top-center" richColors />
</MerchantProvider>
    </PortalGuard>
  );
}

/**
 * Gate every merchant screen on the resolved REAL merchant. The registration
 * page stays reachable so users without a merchant can apply.
 */
function MerchantGate({ children }: { children: React.ReactNode }) {
  const { status, error, reload } = useMerchant();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRegister = pathname.startsWith("/merchant/register");

  if (isRegister) return <>{children}</>;

  if (status === "loading") {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          جارٍ التحقق من حساب التاجر…
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <WifiOff className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-foreground">تعذّر الاتصال بالخادم</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button onClick={reload} variant="outline" className="mt-5 rounded-full">
          <RefreshCcw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (status === "none") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Briefcase className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-foreground">لست تاجرًا على صبح بعد</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          حسابك الحالي غير مرتبط بأي متجر. قدّم طلب انضمام وسيراجعه فريق صبح.
        </p>
        <Button asChild className="mt-5 rounded-full font-bold">
          <Link to="/merchant/register">قدّم طلب الانضمام</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
