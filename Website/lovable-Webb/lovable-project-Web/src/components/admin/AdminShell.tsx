import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, ShieldAlert, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BrandMark } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { adminNav } from "@/lib/admin-data";
import { clearAuth, useRequireRoles } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  // Full-admin ONLY. An admin_employee is redirected to /admin-employee by the
  // guard; the backend also enforces the split, so employees never reach here.
  const access = useRequireRoles(["admin"]);

  function isActive(to: string, exact?: boolean) {
    if (exact) return pathname === to || pathname === `${to}/`;
    return pathname === to || pathname.startsWith(`${to}/`);
  }

  function logout() {
    clearAuth();
    navigate({ to: "/login" });
  }

  if (access === "checking") return null;

  if (access === "denied") {
    return (
      <div className="grid min-h-dvh place-items-center bg-muted/30 px-4">
        <div className="max-w-sm rounded-3xl border border-border bg-card p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 text-lg font-extrabold text-foreground">صلاحية إدارية مطلوبة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            حسابك الحالي لا يحمل دور «admin». اطلب من فريق المنصة منحك الدور ثم سجّل الدخول مجددًا.
          </p>
          <div className="mt-5 grid gap-2">
            <Button asChild className="rounded-full font-bold">
              <Link to="/customer">العودة للمتجر</Link>
            </Button>
            <Button variant="outline" className="rounded-full font-bold" onClick={logout}>
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          <BrandMark className="h-8 w-8 text-primary" />
          <span className="text-lg font-extrabold text-foreground">صبح • إدارة</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 hover:bg-muted"
          aria-label="فتح القائمة"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-l border-border bg-background lg:flex lg:flex-col">
          <div className="flex items-center gap-2 border-b border-border px-5 py-5">
            <BrandMark className="h-9 w-9 text-primary" />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold text-foreground">صبح</span>
              <span className="text-[11px] font-semibold text-muted-foreground">لوحة الإدارة</span>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to, item.exact);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-t border-border p-3">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </aside>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute right-0 top-0 flex h-full w-72 flex-col bg-background shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <div className="flex items-center gap-2">
                  <BrandMark className="h-8 w-8 text-primary" />
                  <span className="text-base font-extrabold text-foreground">صبح • إدارة</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3">
                <ul className="space-y-1">
                  {adminNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to, item.exact);
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground/80 hover:bg-muted",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <div className="border-t border-border p-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </Button>
              </div>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function AdminPage({
  title,
  subtitle,
  action,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export const statusLabels: Record<"pending" | "approved" | "rejected", string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

export const statusTone: Record<"pending" | "approved" | "rejected", string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};
