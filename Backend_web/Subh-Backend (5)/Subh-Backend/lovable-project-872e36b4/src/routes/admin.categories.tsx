import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Power } from "lucide-react";
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
import type { AdminCategory } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "الفئات — لوحة الإدارة" }] }),
  component: CategoriesPage,
});

type FormState = { name: string; description: string; active: boolean };
const empty: FormState = { name: "", description: "", active: true };

function CategoriesPage() {
  const { categories, catalog, addCategory, updateCategory, toggleCategoryActive } =
    useAdminStore();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of catalog)
      m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1);
    return m;
  }, [catalog]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(c: AdminCategory) {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? "", active: c.active });
    setOpen(true);
  }
  function submit() {
    if (!form.name.trim()) {
      toast.error("اكتب اسم الفئة.");
      return;
    }
    if (editing) {
      updateCategory(editing.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        active: form.active,
      });
      toast.success("تم تحديث الفئة.");
    } else {
      addCategory({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        active: form.active,
      });
      toast.success("تم إنشاء الفئة.");
    }
    setOpen(false);
  }

  return (
    <AdminPage
      title="الفئات"
      subtitle="أدر الفئات التي تُصنَّف عليها منتجات المنصة."
      action={
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          فئة جديدة
        </Button>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-[1fr,2fr,100px,180px] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-bold text-muted-foreground md:grid">
          <span>الاسم</span>
          <span>الوصف</span>
          <span>المنتجات</span>
          <span className="text-left">إجراءات</span>
        </div>
        {categories.map((c) => (
          <div
            key={c.id}
            className="grid gap-2 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1fr,2fr,100px,180px] md:items-center"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{c.name}</span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                  c.active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-muted bg-muted text-muted-foreground",
                )}
              >
                {c.active ? "مفعّلة" : "معطّلة"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {c.description || "—"}
            </p>
            <span className="text-sm font-bold text-foreground num">
              {counts.get(c.id) ?? 0}
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                <Pencil className="h-3.5 w-3.5" />
                تعديل
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  toggleCategoryActive(c.id);
                  toast.success(c.active ? "تم تعطيل الفئة." : "تم تفعيل الفئة.");
                }}
              >
                <Power className="h-3.5 w-3.5" />
                {c.active ? "تعطيل" : "تفعيل"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الفئة" : "فئة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>اسم الفئة</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: أزياء"
              />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="وصف موجز يساعد التجّار في اختيار الفئة."
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-bold text-foreground">مفعّلة</p>
                <p className="text-xs text-muted-foreground">
                  الفئات المعطّلة لن تظهر في الاختيارات.
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
            <Button onClick={submit}>
              {editing ? "حفظ التعديلات" : "إنشاء الفئة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
