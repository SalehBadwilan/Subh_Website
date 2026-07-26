import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package as PackageIcon, Search } from "lucide-react";
import {
  MerchantEmployeePage,
  EmptyState,
} from "@/components/merchant-employee/MerchantEmployeeShell";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";




import {
  getEmployeeProducts,
  type ApiEmployeeProduct,
} from "@/lib/api-merchant";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant-employee/products")({
  head: () => ({ meta: [{ title: "المنتجات المسندة — موظف تاجر" }] }),
  component: EmployeeProductsPage,
});

function EmployeeProductsPage() {
 
const [q, setQ] = useState("");
const [products, setProducts] = useState<ApiEmployeeProduct[]>([]);
const [active, setActive] = useState<ApiEmployeeProduct | null>(null);
useEffect(() => {
  getEmployeeProducts()
    .then(setProducts)
    .catch(console.error);
}, []);

const filtered = useMemo(() => {
  if (!q) return products;

  const s = q.toLowerCase();

  return products.filter(
    (p) =>
      p.name_ar.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s),
  );
}, [products, q]);

  

  

  if  (products.length === 0) {
    return (
      <MerchantEmployeePage
        title="المنتجات المسندة"
        subtitle="اعرض المنتجات المسندة إلى متجرك."
      >
        <EmptyState
          icon={PackageIcon}
          title="لا توجد منتجات مسندة."
          description="ستظهر المنتجات فور تعيينها إلى متجرك من قِبل الإدارة."
        />
      </MerchantEmployeePage>
    );
  }

  return (
    <MerchantEmployeePage
      title="المنتجات المسندة"
      subtitle="اعرض المنتجات المسندة إلى متجرك (بدون تعديل الأسعار)."
    >
      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو رمز SKU"
            className="h-11 rounded-full pr-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-right text-sm">
          <thead className="bg-muted/50 text-xs font-bold text-muted-foreground">
            <tr>
              <th className="px-4 py-3">المنتج</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">الفئة</th>
              <th className="px-4 py-3">السعر</th>
              <th className="px-4 py-3">المخزون</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer transition-colors hover:bg-muted/40"
                onClick={() => setActive(p)}
              >
                <td className="px-4 py-3 font-semibold text-foreground">
                  {p.name_ar}
                </td>
                <td className="px-4 py-3 text-muted-foreground num">{p.sku}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  -
                </td>
                <td className="px-4 py-3 font-bold text-foreground num">
                  -
                </td>
                <td className="px-4 py-3">
  <span
    className={cn(
      "rounded-full border px-2 py-0.5 text-[11px] font-bold num",
      (p.inventory?.available ?? 0) === 0
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : (p.inventory?.available ?? 0) <= 10
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
    )}
  >
    {p.inventory?.available ?? 0}
  </span>
</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  لا توجد منتجات مطابقة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-md">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.name_ar}</DialogTitle>
                <DialogDescription className="num">
                  {active.sku} • {active.sku}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    السعر
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-foreground num">
                    -
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    المخزون
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-foreground num">
                    {active.inventory?.available ?? 0}
                  </p>
                </div>
              </div>
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
                للاطلاع فقط — لا تملك صلاحية إضافة أو حذف المنتجات أو تعديل
                الأسعار.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MerchantEmployeePage>
  );
}
