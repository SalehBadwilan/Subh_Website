import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Search,
  Package,
  Power,
  UserPlus,
  X,
  Plus,
  Pencil,
  Loader2,
  AlertCircle,
  RefreshCw,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useCanManage } from "@/lib/admin-role";
import { cn } from "@/lib/utils";
import { api, ApiError, type ApiOk, type Paginated } from "@/lib/api-client";
import { formatSAR } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "المنتجات — لوحة الإدارة" }] }),
  component: ProductsPage,
});

// ---------------------------------------------------------------------------
// Backend ↔ frontend types
// ---------------------------------------------------------------------------
//
// The backend admin product endpoint returns snake_case fields; we read them
// verbatim (no transformation layer) so the UI stays in sync with the API.
//
//   GET /api/admin/products → Paginated<AdminProduct>
//   GET /api/admin/categories → Paginated<AdminCategory>
//   GET /api/admin/merchants → Paginated<AdminMerchant>
//   GET /api/merchant-products?product_id=... → Paginated<MerchantProductAssignment>

type AdminProduct = {
  id: string;
  category_id: string | null;
  sku: string;
  slug: string;
  name_ar: string;
  description_ar: string | null;
  price_sar: number;
  vat_rate: number;
  // draft | active | archived — the catalog visibility state.
  status: "draft" | "active" | "archived";
  weight_grams: number | null;
  is_package: boolean;
  created_at: string;
  updated_at: string;
  category?: { id: string; slug: string; name_ar: string } | null;
  merchants_count: number;
};

type AdminCategory = {
  id: string;
  parent_id: string | null;
  slug: string;
  name_ar: string;
  is_active: boolean;
};

type AdminMerchant = {
  id: string;
  user_id: string;
  status: "active" | "suspended" | "terminated";
  commercial_name: string;
};

type MerchantProductAssignment = {
  id: string;
  merchant_id: string;
  product_id: string;
  is_active: boolean;
};

// ---------------------------------------------------------------------------
// Query keys (centralized so invalidations stay consistent)
// ---------------------------------------------------------------------------

const QK = {
  products: (filters: {
    q: string;
    categoryId: string;
    status: string;
    sort: string;
    page: number;
  }) => ["admin", "products", filters] as const,
  categories: ["admin", "categories", "list"] as const,
  merchants: ["admin", "merchants", "approved"] as const,
  assignments: (productId: string) => ["admin", "products", productId, "assignments"] as const,
};

// ---------------------------------------------------------------------------
// Form state — mirrors the backend create/update payload exactly.
// `weightGrams` replaces the legacy `stock` field because the backend
// `products` table tracks weight, not stock (stock lives in the separate
// `inventory` table, which the admin endpoint does not surface).
// ---------------------------------------------------------------------------

type ProductFormState = {
  name: string; // → name_ar
  description: string; // → description_ar
  categoryId: string; // → category_id
  price: string; // → price_sar
  sku: string; // → sku
  weightGrams: string; // → weight_grams (optional)
  status: AdminProduct["status"]; // → status
};

function emptyForm(defaultCategoryId: string): ProductFormState {
  return {
    name: "",
    description: "",
    categoryId: defaultCategoryId,
    price: "",
    sku: "",
    weightGrams: "",
    status: "draft",
  };
}

function formFromProduct(p: AdminProduct): ProductFormState {
  return {
    name: p.name_ar,
    description: p.description_ar ?? "",
    categoryId: p.category_id ?? "",
    price: String(p.price_sar),
    sku: p.sku,
    weightGrams: p.weight_grams != null ? String(p.weight_grams) : "",
    status: p.status,
  };
}

/** Build the JSON body for create/update, mapping UI field names to the
 *  backend snake_case payload. Undefined fields are omitted so partial
 *  updates only send what changed. */
function buildPayload(form: ProductFormState, opts: { slug?: boolean } = {}) {
  const body: Record<string, unknown> = {
    name_ar: form.name.trim(),
    description_ar: form.description.trim() || null,
    category_id: form.categoryId || null,
    price_sar: Number(form.price),
    sku: form.sku.trim(),
    status: form.status,
  };
  if (form.weightGrams.trim() !== "") {
    body.weight_grams = Number(form.weightGrams);
  }
  // Slug: required on create. Derive a stable slug from name + sku when the
  // backend requires it (it has a NOT NULL UNIQUE constraint on slug).
  if (opts.slug) {
    const slugBase = (form.name.trim() || form.sku.trim())
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 60);
    body.slug = `${slugBase || "product"}-${Date.now().toString(36)}`;
  }
  return body;
}

export function ProductsPage() {
  const canManage = useCanManage();
  const queryClient = useQueryClient();

  // Filters — drive the products query key so changing them refetches.
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("created_at");
  const [page, setPage] = useState(1);

  const [assignFor, setAssignFor] = useState<AdminProduct | null>(null);
  const [editFor, setEditFor] = useState<AdminProduct | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(() => emptyForm(""));

  // --- Categories (for the filter chips + the form select) ----------------
  const categoriesQuery = useQuery({
    queryKey: QK.categories,
    queryFn: () => api.get<Paginated<AdminCategory>>("/api/admin/categories", { limit: 100 }),
  });
  // Memoize the categories array so its identity stays stable across renders
  // (avoids the react-hooks/exhaustive-deps warning when downstream useMemo
  // depends on it). Empty array until the query resolves.
  const categories = useMemo(() => categoriesQuery.data?.data ?? [], [categoriesQuery.data]);
  const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);
  // Set a sensible default category once categories load.
  const defaultCategoryId = activeCategories[0]?.id ?? categories[0]?.id ?? "";

  // --- Merchants (for the assign dialog). Only `active` merchants can be
  //     assigned a product (suspended/terminated are rejected by the backend).
  const merchantsQuery = useQuery({
    queryKey: QK.merchants,
    queryFn: () =>
      api.get<Paginated<AdminMerchant>>("/api/admin/merchants", {
        limit: 100,
        status: "active",
      }),
  });
  const approvedMerchants = merchantsQuery.data?.data ?? [];

  // --- Products (the main list) -------------------------------------------
  // The search box drives `q` directly. To avoid hammering the API on every
  // keystroke we keep the query key stable for the same input value — React
  // Query dedupes concurrent identical requests and serves from cache.
  const productsQuery = useQuery({
    queryKey: QK.products({ q, categoryId: cat, status: statusFilter, sort, page }),
    queryFn: ({ signal }) =>
      api.get<Paginated<AdminProduct>>(
        "/api/admin/products",
        {
          page,
          limit: 20,
          q: q.trim() || undefined,
          category_id: cat !== "all" ? cat : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          sort,
        },
        signal,
      ),
    placeholderData: keepPreviousData,
  });

  const products = productsQuery.data?.data ?? [];
  const totalProducts = productsQuery.data?.pagination.total ?? 0;
  const totalPages = productsQuery.data?.pagination.totalPages ?? 0;

  function categoryName(id: string | null): string {
    if (!id) return "—";
    return categories.find((c) => c.id === id)?.name_ar ?? id;
  }

  // --- Mutations ----------------------------------------------------------
  // Every successful mutation invalidates the products list so the UI shows
  // the real post-mutation state (no optimistic guessing).

  const createMutation = useMutation({
    mutationFn: (formState: ProductFormState) =>
      api.post<ApiOk<AdminProduct>>(
        "/api/admin/products",
        buildPayload(formState, { slug: true }),
        undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("تمت إضافة المنتج.");
      setAddOpen(false);
    },
    onError: (err) => toast.error(errMessage(err, "تعذّرت إضافة المنتج.")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formState }: { id: string; formState: ProductFormState }) =>
      api.put<ApiOk<AdminProduct>>(`/api/admin/products/${id}`, buildPayload(formState), undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("تم تحديث المنتج.");
      setEditFor(null);
    },
    onError: (err) => toast.error(errMessage(err, "تعذّر تحديث المنتج.")),
  });

  const toggleMutation = useMutation({
    mutationFn: (productId: string) =>
      api.patch<ApiOk<{ id: string; status: AdminProduct["status"] }>>(
        `/api/admin/products/${productId}/toggle-active`,
        undefined,
        undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (err) => toast.error(errMessage(err, "تعذّر تغيير حالة المنتج.")),
  });

  // --- Assign / Unassign --------------------------------------------------
  // The admin product list only surfaces merchants_count, not the actual
  // merchant ids. To render the toggle state correctly in the assign dialog,
  // we fetch the live assignments via the existing /api/merchant-products
  // endpoint (filtered by product_id) when the dialog opens.

  const assignmentsQuery = useQuery({
    queryKey: QK.assignments(assignFor?.id ?? ""),
    queryFn: ({ signal }) =>
      api.get<Paginated<MerchantProductAssignment>>(
        "/api/merchant-products",
        { product_id: assignFor!.id, limit: 100 },
        signal,
      ),
    enabled: !!assignFor,
  });

  const assignedMerchantIds = useMemo(
    () =>
      new Set(
        (assignmentsQuery.data?.data ?? [])
          .filter((a) => a.product_id === assignFor?.id)
          .map((a) => a.merchant_id),
      ),
    [assignmentsQuery.data, assignFor],
  );

  const assignMutation = useMutation({
    mutationFn: ({ productId, merchantId }: { productId: string; merchantId: string }) =>
      api.post(`/api/admin/products/${productId}/assign`, { merchant_id: merchantId }, undefined),
    onSuccess: () => {
      if (assignFor) {
        queryClient.invalidateQueries({ queryKey: QK.assignments(assignFor.id) });
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("تم إسناد المنتج للتاجر.");
    },
    onError: (err) => toast.error(errMessage(err, "تعذّر إسناد المنتج.")),
  });

  const unassignMutation = useMutation({
    mutationFn: ({ productId, merchantId }: { productId: string; merchantId: string }) =>
      api.del(`/api/admin/products/${productId}/assign/${merchantId}`, undefined),
    onSuccess: () => {
      if (assignFor) {
        queryClient.invalidateQueries({ queryKey: QK.assignments(assignFor.id) });
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("تم إلغاء إسناد المنتج.");
    },
    onError: (err) => toast.error(errMessage(err, "تعذّر إلغاء إسناد المنتج.")),
  });

  // --- Dialog openers -----------------------------------------------------
  function openAdd() {
    setForm(emptyForm(defaultCategoryId));
    setAddOpen(true);
  }

  function openEdit(p: AdminProduct) {
    setForm(formFromProduct(p));
    setEditFor(p);
  }

  function validate(): string | null {
    if (!form.name.trim()) return "اسم المنتج مطلوب.";
    if (!form.categoryId) return "الفئة مطلوبة.";
    if (!form.sku.trim()) return "رمز SKU مطلوب.";
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return "السعر غير صالح.";
    if (form.weightGrams.trim() !== "") {
      const w = Number(form.weightGrams);
      if (!Number.isFinite(w) || w < 0) return "الوزن غير صالح.";
    }
    return null;
  }

  function submitAdd() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    createMutation.mutate(form);
  }

  function submitEdit() {
    if (!editFor) return;
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    updateMutation.mutate({ id: editFor.id, formState: form });
  }

  function handleToggle(p: AdminProduct) {
    toggleMutation.mutate(p.id, {
      onSuccess: () => {
        toast.success(p.status === "active" ? "تم تعطيل المنتج." : "تم تفعيل المنتج.");
      },
    });
  }

  // --- Render: states -----------------------------------------------------
  // Order matters: loading → error → empty → list.

  const isLoading = productsQuery.isLoading;
  const isFetching = productsQuery.isFetching && !isLoading;
  const loadError = productsQuery.error;

  function refetchAll() {
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    queryClient.invalidateQueries({ queryKey: QK.categories });
    queryClient.invalidateQueries({ queryKey: QK.merchants });
  }

  return (
    <AdminPage title="منتجات المنصة" subtitle="أدر كتالوج صبح وأسند المنتجات إلى التجّار.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="ابحث باسم المنتج أو رمز SKU"
            className="h-11 rounded-full pr-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-11 w-[140px] rounded-full">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="active">مفعّل</SelectItem>
            <SelectItem value="draft">مسودة</SelectItem>
            <SelectItem value="archived">مؤرشف</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(v) => {
            setSort(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-11 w-[160px] rounded-full">
            <SelectValue placeholder="الترتيب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">الأحدث</SelectItem>
            <SelectItem value="name">الاسم</SelectItem>
            <SelectItem value="price_asc">السعر تصاعدي</SelectItem>
            <SelectItem value="price_desc">السعر تنازلي</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={() => refetchAll()}
          disabled={isFetching}
          title="تحديث"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
        {canManage && (
          <Button onClick={openAdd} disabled={activeCategories.length === 0}>
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
            onClick={() => {
              setCat(c.id);
              setPage(1);
            }}
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

      {isLoading ? (
        <ProductsLoading />
      ) : loadError ? (
        <ProductsError
          message={errMessage(loadError, "تعذّر تحميل المنتجات.")}
          onRetry={() => productsQuery.refetch()}
        />
      ) : products.length === 0 ? (
        <EmptyProducts hasAny={totalProducts > 0} />
      ) : (
        <>
          <div className="mb-3 text-xs text-muted-foreground">
            {isFetching ? "جارٍ التحديث…" : `الإجمالي: ${totalProducts} منتج`}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                categoryName={categoryName(p.category_id)}
                canManage={canManage}
                toggling={toggleMutation.isPending && toggleMutation.variables === p.id}
                onEdit={() => openEdit(p)}
                onAssign={() => setAssignFor(p)}
                onToggle={() => handleToggle(p)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                السابق
              </Button>
              <span className="px-2 text-sm font-semibold text-foreground num">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                التالي
              </Button>
            </div>
          )}
        </>
      )}

      <ProductFormDialog
        open={addOpen}
        title="إضافة منتج"
        description="أضف منتجًا جديدًا إلى كتالوج صبح."
        submitLabel="إضافة"
        submitting={createMutation.isPending}
        form={form}
        setForm={setForm}
        categories={activeCategories.length ? activeCategories : categories}
        onClose={() => setAddOpen(false)}
        onSubmit={submitAdd}
      />
      <ProductFormDialog
        open={!!editFor}
        title="تعديل المنتج"
        description={editFor?.name_ar}
        submitLabel="حفظ التغييرات"
        submitting={updateMutation.isPending}
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
                <DialogDescription>{assignFor.name_ar}</DialogDescription>
              </DialogHeader>
              {approvedMerchants.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  لا يوجد تجار معتمدون حتى الآن.
                </p>
              ) : assignmentsQuery.isLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="mr-2">جارٍ تحميل الإسنادات…</span>
                </div>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {approvedMerchants.map((m) => {
                    const assigned = assignedMerchantIds.has(m.id);
                    const busy =
                      (assignMutation.isPending && assignMutation.variables?.merchantId === m.id) ||
                      (unassignMutation.isPending &&
                        unassignMutation.variables?.merchantId === m.id);
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
                            الحالة: {m.status === "active" ? "نشط" : m.status}
                          </p>
                        </div>
                        {assigned ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              unassignMutation.mutate({
                                productId: assignFor.id,
                                merchantId: m.id,
                              })
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                            إزالة
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              assignMutation.mutate({
                                productId: assignFor.id,
                                merchantId: m.id,
                              })
                            }
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProductCard({
  product,
  categoryName,
  canManage,
  toggling,
  onEdit,
  onAssign,
  onToggle,
}: {
  product: AdminProduct;
  categoryName: string;
  canManage: boolean;
  toggling: boolean;
  onEdit: () => void;
  onAssign: () => void;
  onToggle: () => void;
}) {
  // The admin endpoint does not currently surface product images. We render
  // an icon placeholder instead of a broken <img>. (When the API later
  // includes image_url, swap the icon for an <img> with onError fallback.)
  const active = product.status === "active";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{product.name_ar}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground num">
              {product.sku} • {categoryName}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-bold",
            active
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : product.status === "draft"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-muted bg-muted text-muted-foreground",
          )}
        >
          {active ? "مفعّل" : product.status === "draft" ? "مسودة" : "مؤرشف"}
        </span>
      </div>
      {product.description_ar && (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{product.description_ar}</p>
      )}
      <p className="mt-3 text-lg font-extrabold text-foreground num">
        {formatSAR(product.price_sar)}
      </p>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          مسند إلى <span className="font-bold text-foreground num">{product.merchants_count}</span>{" "}
          تاجر
        </span>
        {product.weight_grams != null && (
          <span>
            الوزن: <span className="font-bold text-foreground num">{product.weight_grams} جم</span>
          </span>
        )}
      </div>
      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            تعديل
          </Button>
          <Button size="sm" variant="outline" onClick={onAssign}>
            <UserPlus className="h-3.5 w-3.5" />
            إسناد
          </Button>
          <Button size="sm" variant="ghost" onClick={onToggle} disabled={toggling}>
            {toggling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
            {active ? "تعطيل" : "تفعيل"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ProductFormDialog({
  open,
  title,
  description,
  submitLabel,
  submitting,
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
  submitting: boolean;
  form: ProductFormState;
  setForm: (updater: (prev: ProductFormState) => ProductFormState) => void;
  categories: AdminCategory[];
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
              <Label htmlFor="p-weight">الوزن (جم) — اختياري</Label>
              <Input
                id="p-weight"
                type="number"
                min={0}
                step="1"
                value={form.weightGrams}
                onChange={(e) => setForm((f) => ({ ...f, weightGrams: e.target.value }))}
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
          <div className="grid gap-1.5">
            <Label>الحالة</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, status: v as ProductFormState["status"] }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="active">مفعّل</SelectItem>
                <SelectItem value="archived">مؤرشف</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            إلغاء
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductsLoading() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-6 w-1/4 animate-pulse rounded bg-muted" />
          <div className="mt-3 flex gap-2">
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="rounded-2xl">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>تعذّر تحميل المنتجات</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          إعادة المحاولة
        </Button>
      </AlertDescription>
    </Alert>
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

/** Map any thrown error to a user-facing Arabic message. Prefers the backend's
 *  own error string (it's already localized). */
function errMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
