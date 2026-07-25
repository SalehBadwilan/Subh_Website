import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Users, Power } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAdminStore } from "@/lib/admin-store";
import { useMerchantStore } from "@/lib/merchant-store";
import type { AdminUser, AdminUserRole } from "@/lib/admin-data";
import { useCanManage } from "@/lib/admin-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "المستخدمون — لوحة الإدارة" }] }),
  component: UsersPage,
});

const tabs: { key: AdminUserRole | "all"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "customer", label: "العملاء" },
  { key: "merchant", label: "التجّار" },
  { key: "admin", label: "المسؤولون" },
];

const roleLabel: Record<AdminUserRole, string> = {
  customer: "عميل",
  merchant: "تاجر",
  admin: "مسؤول",
};

export function UsersPage() {
  const canManage = useCanManage();
  const { users, toggleUserActive } = useAdminStore();
  const { applications } = useMerchantStore();
  const [tab, setTab] = useState<AdminUserRole | "all">("all");
  const [q, setQ] = useState("");

  const merchantUsers: AdminUser[] = useMemo(
    () =>
      applications
        .filter((a) => a.status === "approved")
        .map((a) => ({
          id: `m-${a.id}`,
          name: a.profile.ownerName,
          role: "merchant" as const,
          email: a.profile.email,
          phone: a.profile.phone,
          city: a.profile.city,
          active: true,
          joinedAt: a.profile.joinedAt,
        })),
    [applications],
  );

  const all = useMemo(() => [...merchantUsers, ...users], [merchantUsers, users]);

  const filtered = all.filter((u) => {
    if (tab !== "all" && u.role !== tab) return false;
    if (q && !u.name.includes(q) && !u.email.includes(q) && !u.phone.includes(q))
      return false;
    return true;
  });

  return (
    <AdminPage
      title="المستخدمون"
      subtitle="عرض وإدارة العملاء والتجّار والمسؤولين على المنصة."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو البريد أو الجوال"
            className="h-11 rounded-full pr-10"
          />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold transition-colors",
              tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-foreground">
            لا يوجد مستخدمون حتى الآن.
          </h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1.4fr,110px,1fr,140px,120px,140px] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-bold text-muted-foreground md:grid">
            <span>الاسم</span>
            <span>النوع</span>
            <span>البريد</span>
            <span>الجوال</span>
            <span>الحالة</span>
            <span className="text-left">إجراءات</span>
          </div>
          {filtered.map((u) => (
            <div
              key={u.id}
              className="grid gap-2 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1.4fr,110px,1fr,140px,120px,140px] md:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {u.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {u.city ?? "—"} • انضم {u.joinedAt}
                </p>
              </div>
              <span className="text-xs font-bold text-foreground">
                {roleLabel[u.role]}
              </span>
              <span className="truncate text-xs text-muted-foreground" dir="ltr">
                {u.email}
              </span>
              <span className="text-xs text-muted-foreground num" dir="ltr">
                {u.phone}
              </span>
              <span
                className={cn(
                  "w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold",
                  u.active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700",
                )}
              >
                {u.active ? "نشط" : "معطّل"}
              </span>
              <div className="flex justify-end">
                {!canManage ? (
                  <span className="text-[11px] text-muted-foreground">
                    عرض فقط
                  </span>
                ) : u.role === "merchant" ? (
                  <span className="text-[11px] text-muted-foreground">
                    يُدار من التجّار
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      toggleUserActive(u.id);
                      toast.success(
                        u.active ? "تم تعطيل المستخدم." : "تم تفعيل المستخدم.",
                      );
                    }}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {u.active ? "تعطيل" : "تفعيل"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
