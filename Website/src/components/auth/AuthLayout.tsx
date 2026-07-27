import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

/**
 * Shared shell for authentication screens.
 * Right column: brand panel (hidden on mobile).
 * Left column: form card.
 */
export function AuthLayout({
  children,
  step,
}: {
  children: ReactNode;
  step?: { current: number; total: number; label: string };
}) {
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "56px 56px, 72px 72px",
          }}
        />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2">
            <BrandMark className="h-10 w-10" />
            <span className="text-2xl font-extrabold tracking-tight">صبح</span>
          </Link>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight">
            سوق سعودي متعدد التجّار،
            <br />
            بإدارة مركزية واحدة.
          </h2>
          <p className="max-w-md text-base leading-relaxed text-primary-foreground/85">
            منصة صبح تجمع التجّار والمنتجات والطلبات في تجربة موحّدة — بسيطة، سريعة، وموثوقة.
          </p>
        </div>

        <div className="relative text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} صبح. جميع الحقوق محفوظة.
        </div>
      </aside>

      {/* Form column */}
      <main className="flex min-h-dvh flex-col px-5 py-8 sm:px-8 lg:px-12">
        {/* Mobile brand */}
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <Link to="/" className="inline-flex items-center gap-2 text-foreground">
            <BrandMark className="h-9 w-9 text-primary" />
            <span className="text-xl font-extrabold tracking-tight">صبح</span>
          </Link>
          {step && (
            <span className="text-xs font-medium text-muted-foreground num">
              {step.current} / {step.total}
            </span>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill="currentColor" opacity="0.12" />
      <path d="M12 30c0-9.94 8.06-18 18-18v6a12 12 0 0 0-12 12h-6Z" fill="currentColor" />
      <circle cx="34" cy="30" r="4" fill="currentColor" />
    </svg>
  );
}
