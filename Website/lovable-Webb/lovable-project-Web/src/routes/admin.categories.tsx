import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Layers, Loader2, Pencil, Plus, Power, RefreshCcw, WifiOff } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import {
  createAdminCategory,
  getAdminCategories,
  toggleAdminCategory,
  updateAdminCategory,
  type AdminCategory,
} from "@/lib/api-admin";
import { useHasPermission } from "@/lib/admin-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "الفئات — لوحة الإدارة" }] }),
  component: CategoriesPage,
});

type FormState = { name: string; slug: string };
const empty: FormState = { name: "", slug: "" };

type LoadStatus = "loading" | "success" | "error";

function CategoriesPage() {
  const canManage = useHasPermission("categories");
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    // Real backend call: GET /api/admin/categories (active + inactive).
    getAdminCategories()
      .then((rows) => {
        setCategories(rows);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب الفئات.");
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(c: AdminCategory) {
    setEditing(c);
    setForm({ name: c.name_ar, slug: c.slug });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error("اكتب اسم الفئة.");
      return;
    }
    const slug =
      form.slug.trim().toLowerCase().replace(/\s+/g, "-") || `cat-${Date.now().toString(36)}`;
    setSaving(true);
    try {
      if (editing) {
        await updateAdminCategory(editing.id, { name_ar: form.name.trim(), slug });
        toast.success("تم تحديث الفئة في قاعدة البيانات.");
      } else {
        await createAdminCategory({ name_ar: form.name.trim(), slug });
        toast.success("أُضيفت الفئة إلى قاعدة البيانات.");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "تعذّر حفظ الفئة.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: AdminCategory) {
    setBusyId(c.id);
    try {
      const r = await toggleAdminCategory(c.id);
      setCategories((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, is_active: r.is_active } : x)),
      );
      toast.success(r.is_active ? "تم تفعيل الفئة." : "تم تعطيل الفئة.");
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "تعذّر تغيير الحالة.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminPage
      title="فئات المنصة"
      subtitle="فئات الكتالوج الحقيقية — تنعكس فورًا على المتجر وتحليل البحث الذكي."
      action={
        canManage ? (
          <Button onClick={openNew} disabled={status !== "success"}>
            <Plus className="h-4 w-4" />
            فئة جديدة
          </Button>
        ) : undefined
      }
    >
      {status === "loading" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <WifiOff className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <Button onClick={load} variant="outline" className="mt-4 rounded-full">
            <RefreshCcw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {status === "success" && categories.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Layers className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">لا توجد فئات بعد.</p>
        </div>
      )}

      {status === "success" && categories.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{c.name_ar}</p>
                  <p className="num mt-0.5 text-[11px] text-muted-foreground" dir="ltr">
                    {c.slug}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    c.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-muted bg-muted text-muted-foreground",
                  )}
                >
                  {c.is_active ? "مفعّلة" : "معطّلة"}
                </span>
              </div>
              {canManage && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === c.id}
                    onClick={() => toggle(c)}
                  >
                    {busyId === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Power className="h-3.5 w-3.5" />
                    )}
                    {c.is_active ? "تعطيل" : "تفعيل"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && !saving && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الفئة" : "فئة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="c-name">اسم الفئة</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-slug">المعرّف (slug) — أحرف إنجليزية</Label>
              <Input
                id="c-slug"
                dir="ltr"
                placeholder="مثال: coffee"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
