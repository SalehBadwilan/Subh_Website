import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Bell,
  Briefcase,
  Check,
  ChevronLeft,
  ClipboardList,
  HeadphonesIcon,
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { clearAuth, getUser, useRequireAuth } from "@/lib/auth";
import { ApiRequestError, type AuthUser } from "@/lib/api";
import { updateUser } from "@/lib/api-customer";

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
  const ready = useRequireAuth();
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // The real user was stored from POST /api/auth/otp/verify at login.
    const u = getUser();
    setUser(u);
    setName(u?.full_name ?? "");
  }, []);

  if (!ready) return null;

  function logout() {
    clearAuth();
    try {
      sessionStorage.removeItem("subh:phone");
    } catch {
      /* ignore */
    }
    navigate({ to: "/login" });
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!user || trimmed.length < 1) return;
    setSaving(true);
    try {
      // Real backend call: PUT /api/users/:id
      const updated = await updateUser(user.id, { full_name: trimmed });
      const merged = { ...user, ...updated };
      setUser(merged);
      try {
        sessionStorage.setItem("subh:user", JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      setEditing(false);
      toast.success("تم تحديث اسمك بنجاح.");
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "تعذّر تحديث الاسم، حاول مرة أخرى.",
      );
    } finally {
      setSaving(false);
    }
  }

  const displayName = user?.full_name || "عميل صبح";
  const phone = user?.phone || (typeof window !== "undefined" ? sessionStorage.getItem("subh:phone") : "") || "";

  const items: {
    to: "/customer/orders" | "/customer/addresses" | "/customer/notifications" | "/customer/support";
    icon: typeof User;
    label: string;
    hint: string;
  }[] = [
    { to: "/customer/orders", icon: ClipboardList, label: "طلباتي", hint: "تتبّع طلباتك وسجلّ الشراء" },
    { to: "/customer/addresses", icon: MapPin, label: "العناوين", hint: "إدارة عناوين التوصيل" },
    { to: "/customer/notifications", icon: Bell, label: "الإشعارات", hint: "تحديثات الطلبات والعروض" },
    { to: "/customer/support", icon: HeadphonesIcon, label: "الدعم", hint: "تواصل مع فريق صبح" },
  ];

  return (
    <PageContainer>
      <PageHeader title="حسابي" />

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <User className="h-6 w-6" />
          </div>
          {editing ? (
            <form onSubmit={saveName} className="flex min-w-0 flex-1 items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={150}
                aria-label="الاسم الكامل"
                className="h-10"
              />
              <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() => {
                  setEditing(false);
                  setName(user?.full_name ?? "");
                }}
                disabled={saving}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-base font-bold text-foreground">{displayName}</div>
                <div className="num mt-0.5 text-xs text-muted-foreground" dir="ltr">
                  {phone}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 rounded-full"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                تعديل
              </Button>
            </div>
          )}
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
