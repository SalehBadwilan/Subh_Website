import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Package as PackageIcon, RefreshCcw, Search, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchant } from "@/lib/merchant-context";
import { ApiRequestError, type ApiProduct } from "@/lib/api";
import { getProducts } from "@/lib/api-customer";
import {
  getMerchantProducts,
  toggleMerchantProduct,
  type ApiMerchantProduct,
} from "@/lib/api-merchant";
import { formatPrice } from "@/components/customer/ApiProductCard";

export const Route = createFileRoute("/merchant/products")({
  head: () => ({ meta: [{ title: "المنتجات — صبح تاجر" }] }),
  component: MerchantProductsPage,
});

/** merchant-product link row joined (client-side) with the catalog product. */
type JoinedRow = ApiMerchantProduct & { product?: ApiProduct };

type LoadStatus = "loading" | "success" | "error";

function MerchantProductsPage() {
  const { merchant } = useMerchant();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [rows, setRows] = useState<JoinedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!merchant) return;
    setStatus("loading");
    setError(null);
    // Real backend calls: the merchant↔product links + the catalog, joined here
    // (the links table carries ids only).
    Promise.all([getMerchantProducts(merchant.id), getProducts({ limit: 100 })])
      .then(([links, catalog]) => {
        const byId = new Map(catalog.products.map((p) => [p.id, p]));
        setRows(
          links.items.map((l) => ({
            ...l,
            product: l.product_id ? byId.get(l.product_id) : undefined,
          })),
        );
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب المنتجات.");
        setStatus("error");
      });
  }, [merchant]);

  useEffect(load, [load]);

  async function toggle(row: JoinedRow) {
    setBusyId(row.id);
    try {
      // Real backend call: PUT /api/merchant-products/:id
      const updated = await toggleMerchantProduct(row.id, !row.is_active);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...updated } : r)));
      toast.success(updated.is_active ? "تم تفعيل المنتج في متجرك." : "تم إيقاف المنتج في متجرك.");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّر التحديث.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      (r.product?.name_ar ?? "").toLowerCase().includes(needle) ||
      (r.product?.sku ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <MerchantPage
      title="منتجات متجرك"
      subtitle="المنتجات المرتبطة بمتجرك في كتالوج صبح — البيانات حقيقية"
    >
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم أو SKU…"
          className="h-11 rounded-full bg-card pr-10"
          aria-label="بحث في منتجات المتجر"
        />
      </div>

      {status === "loading" && (
        <ul className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-20 rounded-2xl" />
            </li>
          ))}
        </ul>
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

      {status === "success" && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <PackageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {rows.length === 0
              ? "لا توجد منتجات مرتبطة بمتجرك بعد — يديرها فريق صبح المركزي."
              : "لا توجد نتائج مطابقة لبحثك."}
          </p>
        </div>
      )}

      {status === "success" && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <PackageIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-bold text-foreground">
                  {row.product?.name_ar ?? "منتج غير معروف"}
                </p>
                <p className="num mt-0.5 text-xs text-muted-foreground">
                  SKU: {row.product?.sku ?? "—"}
                  {row.product && (
                    <>
                      {" · "}
                      {formatPrice(row.product.price_sar)} ر.س
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {row.is_active ? "مفعّل" : "موقوف"}
                </span>
                <Switch
                  checked={row.is_active}
                  disabled={busyId === row.id}
                  onCheckedChange={() => toggle(row)}
                  aria-label={`تفعيل ${row.product?.name_ar ?? "المنتج"}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </MerchantPage>
  );
}
