import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAdminStore } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "الإعدادات — لوحة الإدارة" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings, roles } = useAdminStore();
  const [form, setForm] = useState(settings);

  function save() {
    updateSettings({
      platformName: form.platformName.trim() || settings.platformName,
      supportEmail: form.supportEmail.trim() || settings.supportEmail,
      supportPhone: form.supportPhone.trim() || settings.supportPhone,
      commissionRate: Number(form.commissionRate) || 0,
      settlementDays: Number(form.settlementDays) || 0,
      currency: form.currency.trim() || settings.currency,
    });
    toast.success("تم حفظ الإعدادات.");
  }

  return (
    <AdminPage
      title="الإعدادات"
      subtitle="إعدادات المنصة والأدوار والصلاحيات."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-extrabold text-foreground">
            إعدادات المنصة
          </h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>اسم المنصة</Label>
              <Input
                value={form.platformName}
                onChange={(e) =>
                  setForm({ ...form, platformName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>بريد الدعم</Label>
                <Input
                  dir="ltr"
                  value={form.supportEmail}
                  onChange={(e) =>
                    setForm({ ...form, supportEmail: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>هاتف الدعم</Label>
                <Input
                  dir="ltr"
                  value={form.supportPhone}
                  onChange={(e) =>
                    setForm({ ...form, supportPhone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>نسبة العمولة (%)</Label>
                <Input
                  inputMode="numeric"
                  value={String(form.commissionRate)}
                  onChange={(e) =>
                    setForm({ ...form, commissionRate: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>أيام التسوية</Label>
                <Input
                  inputMode="numeric"
                  value={String(form.settlementDays)}
                  onChange={(e) =>
                    setForm({ ...form, settlementDays: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>العملة</Label>
                <Input
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="pt-2">
              <Button onClick={save}>
                <Save className="h-4 w-4" />
                حفظ الإعدادات
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-extrabold text-foreground">
              الأدوار والصلاحيات
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            أدوار المسؤولين المعرّفة على المنصة.
          </p>
          <div className="mt-4 space-y-3">
            {roles.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-border p-4"
              >
                <p className="text-sm font-bold text-foreground">{r.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.permissions.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground/80"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminPage>
  );
}
