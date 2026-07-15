import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Store,
  Package,
  Users,
  BarChart3,
} from "lucide-react";
import { BrandMark } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import type { IconType } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: IconType; exact?: boolean };

export const adminEmployeeNav: NavItem[] = [
  { to: "/admin-employee", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { to: "/admin-employee/applications", label: "طلبات التجّار", icon: ClipboardCheck },
  { to: "/admin-employee/merchants", label: "التجّار", icon: Store },
  { to: "/admin-employee/products", label: "المنتجات", icon: Package },
  { to: "/admin-employee/users", label: "المستخدمون", icon: Users },
  { to: "/admin-employee/reports", label: "التقارير", icon: BarChart3 },
];

export function AdminEmployeeShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  function isActive(to: string, exact?: boolean) {
    if (exact) return pathname === to || pathname === `${to}/`;
    return pathname === to || pathname.startsWith(`${to}/`);
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/admin-employee" className="flex items-center gap-2">
          <BrandMark className="h-8 w-8 text-primary" />
          <span className="text-lg font-extrabold text-foreground">صبح • موظف إدارة</span>
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
              <span className="text-[11px] font-semibold text-muted-foreground">
                موظف إدارة
              </span>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {adminEmployeeNav.map((item) => {
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
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigate({ to: "/login" })}
            >
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
                  <span className="text-base font-extrabold text-foreground">
                    صبح • موظف إدارة
                  </span>
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
                  {adminEmployeeNav.map((item) => {
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
                    navigate({ to: "/login" });
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
