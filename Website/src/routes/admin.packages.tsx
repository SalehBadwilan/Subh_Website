import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, BadgeCheck, Star, Power } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdminStore } from "@/lib/admin-store";
import type { AdminPackage } from "@/lib/admin-data";
import { formatSAR } from "@/lib/admin-data";
import { useMerchantStore } from "@/lib/merchant-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/packages")({
  head: () => ({ meta: [{ title: "الباقات — لوحة الإدارة" }] }),
  component: PackagesPage,
});

type FormState = {
  name: string;
  price: string;
  tagline: string;
  features: string;
  featured: boolean;
  active: boolean;
};

const emptyForm: FormState = {
  name: "",
  price: "",
  tagline: "",
  features: "",
  featured: false,
  active: true,
};

function toForm(p: AdminPackage): FormState {
  return {
    name: p.name,
    price: String(p.price),
    tagline: p.tagline,
    features: p.features.join("\n"),
    featured: !!p.featured,
    active: p.active,
  };
}

function PackagesPage() {
  const { packages, addPackage, updatePackage, togglePackageActive } = useAdminStore();
  const { applications } = useMerchantStore();

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of applications) {
      if (a.status !== "approved") continue;
      m.set(a.profile.package, (m.get(a.profile.package) ?? 0) + 1);
    }
    return m;
  }, [applications]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPackage | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: AdminPackage) {
    setEditing(p);
    setForm(toForm(p));
    setOpen(true);
  }

  function submit() {
    if (!form.name.trim()) {
      toast.error("اكتب اسم الباقة.");
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("السعر غير صالح.");
      return;
    }
    const features = form.features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    if (editing) {
      updatePackage(editing.id, {
        name: form.name.trim(),
        price,
        tagline: form.tagline.trim(),
        features,
        featured: form.featured,
        active: form.active,
      });
      toast.success("تم تحديث الباقة.");
    } else {
      addPackage({
        name: form.name.trim(),
        price,
        tagline: form.tagline.trim(),
        features,
        featured: form.featured,
        active: form.active,
      });
      toast.success("تم إنشاء الباقة.");
    }
    setOpen(false);
  }

  return (
    <AdminPage
      title="الباقات"
      subtitle="أنشئ الباقات المتاحة للتجّار وحدّد ميزاتها."
      action={
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          باقة جديدة
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {packages.map((p) => {
          const active = p.active;
          return (
            <div
              key={p.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-5",
                p.featured ? "border-primary/40" : "border-border",
                !active && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-extrabold text-foreground">{p.name}</h3>
                    {p.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Star className="h-3 w-3" />
                        مميّزة
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-muted bg-muted text-muted-foreground",
                  )}
                >
                  {active ? "مفعّلة" : "معطّلة"}
                </span>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-foreground num">
                {formatSAR(p.price)}{" "}
                <span className="text-xs font-semibold text-muted-foreground">/ شهريًا</span>
              </p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-foreground/80">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                <span className="font-bold text-foreground num">{usage.get(p.id) ?? 0}</span> تاجر
                مشترك
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    togglePackageActive(p.id);
                    toast.success(active ? "تم تعطيل الباقة." : "تم تفعيل الباقة.");
                  }}
                >
                  <Power className="h-3.5 w-3.5" />
                  {active ? "تعطيل" : "تفعيل"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الباقة" : "باقة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>اسم الباقة</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: باقة النمو"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>السعر الشهري (ر.س)</Label>
                <Input
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="499"
                />
              </div>
              <div className="space-y-1.5">
                <Label>الشعار الترويجي</Label>
                <Input
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="الأكثر اختيارًا"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>الميزات (كل ميزة في سطر)</Label>
              <Textarea
                rows={5}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder={"حتى ٢٠٠ منتج\nتقارير مبيعات متقدمة\nتسويات أسبوعية"}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-bold text-foreground">باقة مميّزة</p>
                <p className="text-xs text-muted-foreground">تظهر بشكل بارز في صفحة الباقات.</p>
              </div>
              <Switch
                checked={form.featured}
                onCheckedChange={(v) => setForm({ ...form, featured: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-bold text-foreground">مفعّلة</p>
                <p className="text-xs text-muted-foreground">
                  الباقات المعطّلة لن تُعرض للتجّار الجدد.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submit}>{editing ? "حفظ التعديلات" : "إنشاء الباقة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
