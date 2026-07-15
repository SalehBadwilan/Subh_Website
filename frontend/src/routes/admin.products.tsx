import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Package, Power, UserPlus, X, Plus, Pencil } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdminStore } from "@/lib/admin-store";
import { useMerchantStore } from "@/lib/merchant-store";
import type { CatalogProduct } from "@/lib/admin-data";
import { formatSAR } from "@/lib/admin-data";
import { useCanManage } from "@/lib/admin-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "المنتجات — لوحة الإدارة" }] }),
  component: ProductsPage,
});

type ProductFormState = {
  name: string;
  description: string;
  categoryId: string;
  price: string;
  sku: string;
  stock: string;
  active: boolean;
};

function emptyForm(defaultCategoryId: string): ProductFormState {
  return {
    name: "",
    description: "",
    categoryId: defaultCategoryId,
    price: "",
    sku: "",
    stock: "",
    active: true,
  };
}

export function ProductsPage() {
  const canManage = useCanManage();
  const {
    catalog,
    categories,
    addProduct,
    updateProduct,
    toggleProductActive,
    assignProductToMerchant,
    unassignProductFromMerchant,
  } = useAdminStore();
  const { applications } = useMerchantStore();
  const approved = useMemo(
    () => applications.filter((a) => a.status === "approved"),
    [applications],
  );

  const activeCategories = useMemo(
    () => categories.filter((c) => c.active),
    [categories],
  );
  const defaultCategoryId = activeCategories[0]?.id ?? categories[0]?.id ?? "";

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [assignFor, setAssignFor] = useState<CatalogProduct | null>(null);
  const [editFor, setEditFor] = useState<CatalogProduct | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(() =>
    emptyForm(defaultCategoryId),
  );

  const filtered = useMemo(
    () =>
      catalog.filter((p) => {
        if (cat !== "all" && p.categoryId !== cat) return false;
        if (q && !p.name.includes(q) && !p.sku.includes(q)) return false;
        return true;
      }),
    [catalog, q, cat],
  );

  function categoryName(id: string) {
    return categories.find((c) => c.id === id)?.name ?? id;
  }

  function openAdd() {
    setForm(emptyForm(defaultCategoryId));
    setAddOpen(true);
  }

  function openEdit(p: CatalogProduct) {
    setForm({
      name: p.name,
      description: p.description ?? "",
      categoryId: p.categoryId,
      price: String(p.price),
      sku: p.sku,
      stock: String(p.stock),
      active: p.active,
    });
    setEditFor(p);
  }

  function validate(): string | null {
    if (!form.name.trim()) return "اسم المنتج مطلوب.";
    if (!form.categoryId) return "الفئة مطلوبة.";
    if (!form.sku.trim()) return "رمز SKU مطلوب.";
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return "السعر غير صالح.";
    const stock = Number(form.stock);
    if (!Number.isInteger(stock) || stock < 0) return "الكمية غير صالحة.";
    return null;
  }

  function submitAdd() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    addProduct({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId,
      price: Number(form.price),
      sku: form.sku.trim(),
      stock: Number(form.stock),
      active: form.active,
    });
    toast.success("تمت إضافة المنتج.");
    setAddOpen(false);
  }

  function submitEdit() {
    if (!editFor) return;
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    updateProduct(editFor.id, {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId,
      price: Number(form.price),
      sku: form.sku.trim(),
      stock: Number(form.stock),
      active: form.active,
    });
    toast.success("تم تحديث المنتج.");
    setEditFor(null);
  }

  return (
    <AdminPage
      title="منتجات المنصة"
      subtitle="أدر كتالوج صبح وأسند المنتجات إلى التجّار."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم المنتج أو رمز SKU"
            className="h-11 rounded-full pr-10"
          />
        </div>
        {canManage && (
          <Button onClick={openAdd} disabled={activeCategories.length === 0}>
            <Plus className="h-4 w-4" />
            إضافة منتج
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[{ id: "all", name: "الكل" }, ...activeCategories].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold transition-colors",
              cat === c.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:bg-muted",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyProducts hasAny={catalog.length > 0} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground num">
                    {p.sku} • {categoryName(p.categoryId)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    p.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-muted bg-muted text-muted-foreground",
                  )}
                >
                  {p.active ? "مفعّل" : "معطّل"}
                </span>
              </div>
              <p className="mt-3 text-lg font-extrabold text-foreground num">
                {formatSAR(p.price)}
              </p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  المخزون:{" "}
                  <span className="font-bold text-foreground num">{p.stock}</span>
                </span>
                <span>
                  مسند إلى{" "}
                  <span className="font-bold text-foreground num">
                    {p.assignedMerchantIds.length}
                  </span>{" "}
                  تاجر
                </span>
              </div>
              {canManage && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAssignFor(p)}
                    disabled={approved.length === 0}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    إسناد
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      toggleProductActive(p.id);
                      toast.success(
                        p.active ? "تم تعطيل المنتج." : "تم تفعيل المنتج.",
                      );
                    }}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {p.active ? "تعطيل" : "تفعيل"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialogs share the same form */}
      <ProductFormDialog
        open={addOpen}
        title="إضافة منتج"
        description="أضف منتجًا جديدًا إلى كتالوج صبح."
        submitLabel="إضافة"
        form={form}
        setForm={setForm}
        categories={activeCategories.length ? activeCategories : categories}
        onClose={() => setAddOpen(false)}
        onSubmit={submitAdd}
      />
      <ProductFormDialog
        open={!!editFor}
        title="تعديل المنتج"
        description={editFor?.name}
        submitLabel="حفظ التغييرات"
        form={form}
        setForm={setForm}
        categories={activeCategories.length ? activeCategories : categories}
        onClose={() => setEditFor(null)}
        onSubmit={submitEdit}
      />

      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent>
          {assignFor && (
            <>
              <DialogHeader>
                <DialogTitle>إسناد المنتج إلى التجّار</DialogTitle>
                <DialogDescription>{assignFor.name}</DialogDescription>
              </DialogHeader>
              {approved.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  لا يوجد تجار معتمدون حتى الآن.
                </p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {approved.map((m) => {
                    const assigned = assignFor.assignedMerchantIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">
                            {m.profile.businessName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {m.profile.city}
                          </p>
                        </div>
                        {assigned ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              unassignProductFromMerchant(assignFor.id, m.id);
                              setAssignFor((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      assignedMerchantIds:
                                        prev.assignedMerchantIds.filter(
                                          (x) => x !== m.id,
                                        ),
                                    }
                                  : prev,
                              );
                              toast.success("تم إلغاء إسناد المنتج.");
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                            إزالة
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              assignProductToMerchant(assignFor.id, m.id);
                              setAssignFor((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      assignedMerchantIds: [
                                        ...prev.assignedMerchantIds,
                                        m.id,
                                      ],
                                    }
                                  : prev,
                              );
                              toast.success("تم إسناد المنتج للتاجر.");
                            }}
                          >
                            إسناد
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignFor(null)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

function ProductFormDialog({
  open,
  title,
  description,
  submitLabel,
  form,
  setForm,
  categories,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  form: ProductFormState;
  setForm: (updater: (prev: ProductFormState) => ProductFormState) => void;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="p-name">اسم المنتج</Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-desc">الوصف</Label>
            <Textarea
              id="p-desc"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label>الفئة</Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر فئة" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="p-price">السعر (ر.س)</Label>
              <Input
                id="p-price"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-stock">الكمية</Label>
              <Input
                id="p-stock"
                type="number"
                min={0}
                step="1"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-sku">رمز SKU</Label>
            <Input
              id="p-sku"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((f) => ({ ...f, active: e.target.checked }))
              }
              className="h-4 w-4 rounded border-border"
            />
            المنتج مفعّل
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={onSubmit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyProducts({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Package className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-foreground">
        {hasAny ? "لا توجد منتجات مطابقة للبحث." : "لا توجد منتجات بعد."}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasAny
          ? "غيّر الفلاتر أو مصطلح البحث."
          : "ابدأ بإضافة منتج جديد إلى الكتالوج."}
      </p>
    </div>
  );
}
