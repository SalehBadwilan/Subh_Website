import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Briefcase, ChevronLeft, ClipboardList, HeadphonesIcon, LogOut, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";

export const Route = createFileRoute("/customer/profile")({
  head: () => ({
    meta: [
      { title: "حسابي — صبح" },
      { name: "description", content: "إدارة حسابك في صبح." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const phone =
    (typeof window !== "undefined" && sessionStorage.getItem("subh:phone")) ||
    "+966501234567";

  function logout() {
    try {
      sessionStorage.removeItem("subh:phone");
    } catch {
      /* ignore */
    }
    navigate({ to: "/login" });
  }

  const items: { to: "/customer/orders" | "/customer/addresses" | "/customer/notifications" | "/customer/support"; icon: typeof User; label: string; hint: string }[] = [
    { to: "/customer/orders", icon: ClipboardList, label: "طلباتي", hint: "تتبّع طلباتك وسجلّ الشراء" },
    { to: "/customer/addresses", icon: MapPin, label: "العناوين", hint: "إدارة عناوين التوصيل" },
    { to: "/customer/notifications", icon: Bell, label: "الإشعارات", hint: "تحديثات الطلبات والعروض" },
    { to: "/customer/support", icon: HeadphonesIcon, label: "الدعم", hint: "تواصل مع فريق صبح" },
  ];

  return (
    <PageContainer>
      <PageHeader title="حسابي" />

      <section className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
          <User className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-foreground">عميل صبح</div>
          <div className="num mt-0.5 text-xs text-muted-foreground" dir="ltr">
            {phone}
          </div>
        </div>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map(({ to, icon: Icon, label, hint }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:shadow-soft"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground">{hint}</div>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="my-6 border-t border-border" role="separator" aria-hidden="true" />

      <Link
        to="/merchant/register"
        className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:shadow-soft"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Briefcase className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">انضم كتاجر</div>
          <div className="text-xs text-muted-foreground">افتح متجرك على صبح وابدأ البيع</div>
        </div>
        <ChevronLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
      </Link>

      <div className="mt-8">
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full text-destructive hover:bg-destructive/5 hover:text-destructive sm:w-auto"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </PageContainer>
  );
}
