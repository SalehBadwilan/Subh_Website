import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, User, Home, LayoutGrid, ShoppingCart, ClipboardList, Search } from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/auth/AuthLayout";
import { useCart } from "@/lib/cart-context";
import { useAppStore } from "@/lib/app-store";
import { cn } from "@/lib/utils";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Shared shell for all customer pages: sticky header (brand + search +
 * notifications + profile) and mobile bottom nav. Wraps children in a
 * consistent full-height container.
 */
export function CustomerShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/30 pb-24 lg:pb-0">
      <SiteHeader />
      {children}
      <MobileBottomNav />
    </div>
  );
}

export function SiteHeader() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const unreadNotifications = useAppStore().unreadCount > 0;

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    navigate({ to: "/customer/search", search: { q: q || undefined } });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:py-4">
        <Link
          to="/customer"
          className="flex shrink-0 items-center gap-2"
          aria-label="صبح — الرئيسية"
        >
          <BrandMark className="h-9 w-9 text-primary" />
          <span className="hidden text-xl font-extrabold tracking-tight text-foreground sm:inline">
            صبح
          </span>
        </Link>

        <form onSubmit={onSearchSubmit} className="relative flex-1" role="search">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              if (typeof window !== "undefined" && window.innerWidth < 640) {
                navigate({ to: "/customer/search" });
              }
            }}
            placeholder="ابحث عن منتج أو فئة…"
            className="h-11 rounded-full border-transparent bg-muted pr-10 pl-4 text-sm focus-visible:border-primary/40 focus-visible:bg-background"
            aria-label="بحث"
          />
        </form>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <IconLink to="/customer/notifications" label="الإشعارات" badge={unreadNotifications}>
            <Bell className="h-5 w-5" />
          </IconLink>
          <IconLink to="/customer/profile" label="حسابي" className="hidden sm:inline-flex">
            <User className="h-5 w-5" />
          </IconLink>
        </div>
      </div>
    </header>
  );
}

function IconLink({
  to,
  children,
  label,
  badge,
  className,
}: {
  to: string;
  children: ReactNode;
  label: string;
  badge?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        "relative grid h-10 w-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {children}
      {badge && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
      )}
    </Link>
  );
}

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cartCount = useCart().count;

  const items: { label: string; icon: IconType; to: string; match: (p: string) => boolean; badge?: number }[] = [
    { label: "الرئيسية", icon: Home, to: "/customer", match: (p) => p === "/customer" || p === "/customer/" },
    { label: "الفئات", icon: LayoutGrid, to: "/customer/categories", match: (p) => p.startsWith("/customer/categor") },
    { label: "السلّة", icon: ShoppingCart, to: "/customer/cart", match: (p) => p.startsWith("/customer/cart") || p.startsWith("/customer/checkout"), badge: cartCount },
    { label: "طلباتي", icon: ClipboardList, to: "/customer/orders", match: (p) => p.startsWith("/customer/orders") },
    { label: "حسابي", icon: User, to: "/customer/profile", match: (p) => p.startsWith("/customer/profile") || p.startsWith("/customer/addresses") || p.startsWith("/customer/support") },
  ];

  return (
    <nav
      aria-label="التنقّل السفلي"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <li key={item.label} className="flex-1">
              <Link
                to={item.to}
                className={cn(
                  "relative flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge ? (
                    <span className="num absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                <span>{item.label}</span>
                {active && (
                  <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-4 rounded-3xl border border-border bg-card px-6 py-8 text-sm text-muted-foreground">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <BrandMark className="h-8 w-8 text-primary" />
          <span className="text-lg font-extrabold text-foreground">صبح</span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <Link to="/customer/support" className="hover:text-foreground">الدعم</Link>
          <Link to="/customer/orders" className="hover:text-foreground">طلباتي</Link>
          <Link to="/customer/addresses" className="hover:text-foreground">العناوين</Link>
        </div>
        <p className="text-xs">
          © {new Date().getFullYear()} صبح. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}

/** Standard page container used inside CustomerShell. */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto max-w-6xl px-4 py-6 sm:py-8 lg:py-10", className)}>
      {children}
    </main>
  );
}

/** Compact page header with title, optional subtitle, and back link. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
