import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHasPermission } from "@/lib/admin-role";
import {
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Search,
  Trash2,
  UserPlus,
  WifiOff,
  X,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import {
  assignProductToMerchant,
  createAdminProduct,
  deleteProductImage,
  formatSAR,
  getAdminCategories,
  getAdminMerchants,
  getAdminProducts,
  getAllInventory,
  getMerchantProductLinks,
  getProductImages,
  setProductStock,
  toggleAdminProduct,
  unassignProductFromMerchant,
  updateAdminProduct,
  uploadProductImage,
  type AdminCategory,
  type AdminMerchant,
  type AdminProduct,
  type AdminProductImage,
  type ApiInventory,
  type MerchantProductLink,
} from "@/lib/api-admin";
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
  imageFile: File | null;
  merchantId: string;
};

function emptyForm(): ProductFormState {
  return {
    name: "",
    description: "",
    categoryId: "",
    price: "",
    sku: "",
    stock: "",
    active: true,
    imageFile: null,
    merchantId: "",
  };
}

/** URL-safe slug from the SKU (unique server-side) + a short time suffix. */
function makeSlug(sku: string): string {
  const base = sku
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "p"}-${Date.now().toString(36)}`;
}

type LoadStatus = "loading" | "success" | "error";

export function ProductsPage() {
  const canManage = useHasPermission("products");

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [images, setImages] = useState<AdminProductImage[]>([]);
  const [inventory, setInventory] = useState<ApiInventory[]>([]);
  const [links, setLinks] = useState<MerchantProductLink[]>([]);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editFor, setEditFor] = useState<AdminProduct | null>(null);
  const [imageFor, setImageFor] = useState<AdminProduct | null>(null);
  const [assignFor, setAssignFor] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setLoadError(null);
    // Real backend calls: the admin catalog + everything joined client-side
    // (primary images, stock, merchant assignments).
    Promise.all([
      getAdminProducts({ limit: 100 }),
      getAdminCategories(),
      getAdminMerchants({ status: "active" }),
      getProductImages(),
      getAllInventory(),
      getMerchantProductLinks(),
    ])
      .then(([prods, cats, merchs, imgs, inv, lks]) => {
        setProducts(prods.products);
        setCategories(cats);
        setMerchants(merchs.merchants);
        setImages(imgs);
        setInventory(inv);
        setLinks(lks);
        setStatus("success");
      })
      .catch((err) => {
        setLoadError(err instanceof ApiRequestError ? err.message : "تعذّر جلب بيانات الكتالوج.");
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

  const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);

  const primaryImageByProduct = useMemo(() => {
    const map = new Map<string, AdminProductImage>();
    for (const img of images) {
      if (!img.product_id) continue;
      const existing = map.get(img.product_id);
      if (!existing || (img.is_primary && !existing.is_primary)) map.set(img.product_id, img);
    }
    return map;
  }, [images]);

  const stockByProduct = useMemo(() => {
    const map = new Map<string, ApiInventory>();
    for (const row of inventory) {
      if (row.sellable_type === "product") map.set(row.sellable_id, row);
    }
    return map;
  }, [inventory]);

  const linksByProduct = useMemo(() => {
    const map = new Map<string, MerchantProductLink[]>();
    for (const l of links) {
      if (!l.product_id) continue;
      const arr = map.get(l.product_id) ?? [];
      arr.push(l);
      map.set(l.product_id, arr);
    }
    return map;
  }, [links]);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (cat !== "all" && p.category_id !== cat) return false;
        if (q && !p.name_ar.includes(q) && !p.sku.toLowerCase().includes(q.toLowerCase()))
          return false;
        return true;
      }),
    [products, q, cat],
  );

  function openAdd() {
    setForm({ ...emptyForm(), categoryId: activeCategories[0]?.id ?? "" });
    setAddOpen(true);
  }

  function openEdit(p: AdminProduct) {
    setForm({
      name: p.name_ar,
      description: p.description_ar ?? "",
      categoryId: p.category_id ?? "",
      price: String(p.price_sar),
      sku: p.sku,
      stock: String(stockByProduct.get(p.id)?.on_hand ?? ""),
      active: p.status === "active",
      imageFile: null,
      merchantId: "",
    });
    setEditFor(p);
  }

  function validate(requireStock: boolean): string | null {
    if (!form.name.trim()) return "اسم المنتج مطلوب.";
    if (!form.sku.trim()) return "رمز SKU مطلوب.";
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return "السعر غير صالح.";
    if (requireStock || form.stock !== "") {
      const stock = Number(form.stock);
      if (!Number.isInteger(stock) || stock < 0) return "الكمية غير صالحة.";
    }
    return null;
  }

  async function submitAdd() {
    const err = validate(true);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      // 1) The product row itself.
      const product = await createAdminProduct({
        name_ar: form.name.trim(),
        description_ar: form.description.trim() || undefined,
        category_id: form.categoryId || null,
        price_sar: Number(form.price),
        sku: form.sku.trim(),
        slug: makeSlug(form.sku),
        status: form.active ? "active" : "draft",
      });
      // 2) Stock — without it the product can never be ordered.
      await setProductStock({
        productId: product.id,
        sku: product.sku,
        onHand: Number(form.stock),
      });
      // 3) The image file → uploads/products + product_images row (primary).
      if (form.imageFile) {
        await uploadProductImage({ file: form.imageFile, productId: product.id });
      }
      // 4) Authorized merchant (required for customers to buy it).
      if (form.merchantId) {
        await assignProductToMerchant(product.id, form.merchantId);
      }
      toast.success(`تمت إضافة «${product.name_ar}» إلى الكتالوج الحقيقي.`);
      setAddOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "تعذّر إضافة المنتج.");
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit() {
    if (!editFor) return;
    const err = validate(false);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      await updateAdminProduct(editFor.id, {
        name_ar: form.name.trim(),
        description_ar: form.description.trim() || undefined,
        category_id: form.categoryId || null,
        price_sar: Number(form.price),
        sku: form.sku.trim(),
        status: form.active ? "active" : "archived",
      });
      if (form.stock !== "") {
        await setProductStock({
          productId: editFor.id,
          sku: form.sku.trim(),
          onHand: Number(form.stock),
        });
      }
      toast.success("تم حفظ التعديلات في قاعدة البيانات.");
      setEditFor(null);
      load();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "تعذّر حفظ التعديلات.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: AdminProduct) {
    setBusyId(p.id);
    try {
      const r = await toggleAdminProduct(p.id);
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, status: r.status as AdminProduct["status"] } : x)),
      );
      toast.success(r.status === "active" ? "تم تفعيل المنتج." : "تم أرشفة المنتج.");
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "تعذّر تغيير الحالة.");
    } finally {
      setBusyId(null);
    }
  }

  function categoryName(id: string | null) {
    if (!id) return "بدون فئة";
    return categories.find((c) => c.id === id)?.name_ar ?? "—";
  }

  return (
    <AdminPage
      title="منتجات المنصة"
      subtitle="كتالوج صبح الحقيقي — يُقرأ ويُكتب مباشرةً في قاعدة البيانات."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم المنتج أو رمز SKU"
            className="h-11 rounded-full pr-10"
          />
        </div>
        {canManage && (
          <Button onClick={openAdd} disabled={status !== "success"}>
            <Plus className="h-4 w-4" />
            إضافة منتج
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[{ id: "all", name_ar: "الكل" }, ...activeCategories].map((c) => (
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
            {c.name_ar}
          </button>
        ))}
      </div>

      {status === "loading" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex gap-3">
                <Skeleton className="h-16 w-16 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-1/3" />
                </div>
              </div>
            </div>
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
          <p className="mt-3 text-sm text-muted-foreground">{loadError}</p>
          <Button onClick={load} variant="outline" className="mt-4 rounded-full">
            <RefreshCcw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {status === "success" && filtered.length === 0 && (
        <EmptyProducts hasAny={products.length > 0} />
      )}

      {status === "success" && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const img = primaryImageByProduct.get(p.id);
            const stock = stockByProduct.get(p.id);
            const assigned = linksByProduct.get(p.id) ?? [];
            const active = p.status === "active";
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
                    {img ? (
                      <img
                        src={img.image_url}
                        alt={p.name_ar}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{p.name_ar}</p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                          active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-muted bg-muted text-muted-foreground",
                        )}
                      >
                        {active ? "مفعّل" : p.status === "draft" ? "مسودة" : "مؤرشف"}
                      </span>
                    </div>
                    <p className="num mt-0.5 text-[11px] font-semibold text-muted-foreground">
                      {p.sku} • {categoryName(p.category_id)}
                    </p>
                    <p className="num mt-1 text-lg font-extrabold text-foreground">
                      {formatSAR(p.price_sar)}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    المخزون:{" "}
                    <span
                      className={cn(
                        "num font-bold",
                        (stock?.on_hand ?? 0) > 0 ? "text-foreground" : "text-destructive",
                      )}
                    >
                      {stock ? stock.on_hand : "—"}
                    </span>
                  </span>
                  <span>
                    مسند إلى{" "}
                    <span className="num font-bold text-foreground">{assigned.length}</span> تاجر
                  </span>
                </div>

                {canManage && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                      تعديل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setImageFor(p)}>
                      <ImagePlus className="h-3.5 w-3.5" />
                      صورة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssignFor(p)}
                      disabled={merchants.length === 0}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      إسناد
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === p.id}
                      onClick={() => toggleActive(p)}
                    >
                      {busyId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      {active ? "أرشفة" : "تفعيل"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit dialogs */}
      <ProductFormDialog
        open={addOpen}
        title="إضافة منتج"
        description="يُحفظ المنتج وصورته ومخزونه مباشرةً في قاعدة بيانات صبح."
        submitLabel="إضافة"
        withImage
        withMerchant
        form={form}
        setForm={setForm}
        categories={activeCategories.length ? activeCategories : categories}
        merchants={merchants}
        saving={saving}
        onClose={() => setAddOpen(false)}
        onSubmit={submitAdd}
      />
      <ProductFormDialog
        open={!!editFor}
        title="تعديل المنتج"
        description={editFor?.name_ar}
        submitLabel="حفظ التغييرات"
        form={form}
        setForm={setForm}
        categories={activeCategories.length ? activeCategories : categories}
        merchants={merchants}
        saving={saving}
        onClose={() => setEditFor(null)}
        onSubmit={submitEdit}
      />

      {/* Image manager */}
      <ImageDialog
        product={imageFor}
        images={imageFor ? images.filter((i) => i.product_id === imageFor.id) : []}
        onClose={() => setImageFor(null)}
        onChanged={load}
      />

      {/* Assign */}
      <AssignDialog
        product={assignFor}
        merchants={merchants}
        assigned={assignFor ? (linksByProduct.get(assignFor.id) ?? []) : []}
        onClose={() => setAssignFor(null)}
        onChanged={load}
      />
    </AdminPage>
  );
}

/* --- Form dialog ----------------------------------------------------------- */

function ProductFormDialog({
  open,
  title,
  description,
  submitLabel,
  withImage = false,
  withMerchant = false,
  form,
  setForm,
  categories,
  merchants,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  withImage?: boolean;
  withMerchant?: boolean;
  form: ProductFormState;
  setForm: (updater: (prev: ProductFormState) => ProductFormState) => void;
  categories: { id: string; name_ar: string }[];
  merchants: AdminMerchant[];
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
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
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
                    {c.name_ar}
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
              <Label htmlFor="p-stock">الكمية في المخزون</Label>
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
              dir="ltr"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            />
          </div>

          {withImage && (
            <div className="grid gap-1.5">
              <Label htmlFor="p-image">صورة المنتج (JPG / PNG / WebP — حتى 5MB)</Label>
              <Input
                id="p-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setForm((f) => ({ ...f, imageFile: e.target.files?.[0] ?? null }))}
              />
              {form.imageFile && (
                <p className="text-[11px] text-muted-foreground">
                  سيُرفع الملف «{form.imageFile.name}» ويُخزَّن في الخادم كصورة أساسية.
                </p>
              )}
            </div>
          )}

          {withMerchant && (
            <div className="grid gap-1.5">
              <Label>التاجر المنفّذ (ليصبح المنتج قابلًا للشراء)</Label>
              <Select
                value={form.merchantId}
                onValueChange={(v) => setForm((f) => ({ ...f, merchantId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر تاجرًا (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  {merchants.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.commercial_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            المنتج مفعّل (ظاهر للعملاء)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --- Image dialog ----------------------------------------------------------- */

function ImageDialog({
  product,
  images,
  onClose,
  onChanged,
}: {
  product: AdminProduct | null;
  images: AdminProductImage[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!product) return;
    setUploading(true);
    try {
      // Real backend call: multipart POST /api/product-images/upload.
      await uploadProductImage({ file, productId: product.id });
      toast.success("رُفعت الصورة وخُزّنت في الخادم.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "تعذّر رفع الصورة.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      await deleteProductImage(id);
      toast.success("حُذفت الصورة.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "تعذّر حذف الصورة.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && !uploading && onClose()}>
      <DialogContent className="max-w-lg">
        {product && (
          <>
            <DialogHeader>
              <DialogTitle>صور المنتج</DialogTitle>
              <DialogDescription>{product.name_ar}</DialogDescription>
            </DialogHeader>

            {images.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                لا توجد صور مخزّنة لهذا المنتج بعد.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="group relative overflow-hidden rounded-xl border border-border"
                  >
                    <img src={img.image_url} alt="" className="aspect-square w-full object-cover" />
                    {img.is_primary && (
                      <span className="absolute right-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                        أساسية
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(img.id)}
                      disabled={deleting === img.id}
                      aria-label="حذف الصورة"
                      className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                    >
                      {deleting === img.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="img-file">رفع صورة جديدة (تصبح الأساسية)</Label>
              <Input
                id="img-file"
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                }}
              />
              {uploading && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جارٍ الرفع إلى الخادم…
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={uploading}>
                إغلاق
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --- Assign dialog ----------------------------------------------------------- */

function AssignDialog({
  product,
  merchants,
  assigned,
  onClose,
  onChanged,
}: {
  product: AdminProduct | null;
  merchants: AdminMerchant[];
  assigned: MerchantProductLink[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const assignedIds = new Set(assigned.map((l) => l.merchant_id));

  async function toggle(m: AdminMerchant) {
    if (!product) return;
    setBusy(m.id);
    try {
      if (assignedIds.has(m.id)) {
        await unassignProductFromMerchant(product.id, m.id);
        toast.success("تم إلغاء إسناد المنتج.");
      } else {
        await assignProductToMerchant(product.id, m.id);
        toast.success("تم إسناد المنتج للتاجر.");
      }
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "تعذّر تحديث الإسناد.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {product && (
          <>
            <DialogHeader>
              <DialogTitle>إسناد المنتج إلى التجّار</DialogTitle>
              <DialogDescription>{product.name_ar}</DialogDescription>
            </DialogHeader>
            {merchants.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                لا يوجد تجار نشطون حتى الآن.
              </p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {merchants.map((m) => {
                  const isAssigned = assignedIds.has(m.id);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {m.commercial_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          عمولة{" "}
                          {m.commission_rate != null
                            ? `${Math.round(m.commission_rate * 100)}٪`
                            : "—"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={isAssigned ? "outline" : "default"}
                        disabled={busy === m.id}
                        onClick={() => toggle(m)}
                      >
                        {busy === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isAssigned ? (
                          <>
                            <X className="h-3.5 w-3.5" />
                            إزالة
                          </>
                        ) : (
                          "إسناد"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                إغلاق
              </Button>
            </DialogFooter>
          </>
        )}
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
        {hasAny ? "غيّر الفلاتر أو مصطلح البحث." : "ابدأ بإضافة منتج جديد إلى الكتالوج."}
      </p>
    </div>
  );
}
