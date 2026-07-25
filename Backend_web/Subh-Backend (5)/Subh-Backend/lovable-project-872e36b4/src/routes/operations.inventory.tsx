import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Boxes, Minus, Plus, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  OperationsPage,
  EmptyState,
} from "@/components/operations/OperationsShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAdminStore } from "@/lib/admin-store";
import { formatSAR, type CatalogProduct } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operations/inventory")({
  head: () => ({
    meta: [
      { title: "المخزون — لوحة العمليات" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OperationsInventoryPage,
});

const LOW = 20;

function OperationsInventoryPage() {
  const { catalog, adjustStock, stockMovements } = useAdminStore();
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [active, setActive] = useState<CatalogProduct | null>(null);
  const [delta, setDelta] = useState<string>("");
  const [reason, setReason] = useState<string>("استلام مخزون");

  const filtered = useMemo(() => {
    return catalog.filter((p) => {
      if (onlyLow && p.stock > LOW) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q.toLowerCase()) &&
        !p.sku.toLowerCase().includes(q.toLowerCase())
      )
        return false;
      return true;
    });
  }, [catalog, q, onlyLow]);

  const lowCount = useMemo(
    () => catalog.filter((p) => p.active && p.stock <= LOW).length,
    [catalog],
  );

  function submit(dir: 1 | -1) {
    if (!active) return;
    const n = Math.abs(parseInt(delta || "0", 10));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("أدخل كمية صحيحة أكبر من صفر.");
      return;
    }
    adjustStock(active.id, dir * n, reason.trim() || (dir > 0 ? "زيادة" : "خصم"));
    toast.success(
      dir > 0
        ? `تمت إضافة ${n} إلى مخزون «${active.name}».`
        : `تم خصم ${n} من مخزون «${active.name}».`,
    );
    setActive(null);
    setDelta("");
    setReason("استلام مخزون");
  }

  if (catalog.length === 0) {
    return (
      <OperationsPage title="المخزون" subtitle="إدارة كميات المخزون وحركاته.">
        <EmptyState
          icon={Boxes}
          title="لا يوجد مخزون حالياً."
          hint="سيظهر المخزون هنا فور إضافة منتجات من قِبل الإدارة."
        />
      </OperationsPage>
    );
  }

  return (
    <OperationsPage
      title="المخزون"
      subtitle="عرض الكميات وتسجيل حركات المخزون. لا يمكنك تعديل المنتجات أو أسعارها."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم المنتج أو SKU"
            className="h-11 rounded-full pr-10"
          />
        </div>
        <button
          type="button"
          onClick={() => setOnlyLow((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors",
            onlyLow
              ? "border-rose-300 bg-rose-50 text-rose-700"
              : "border-border bg-card text-foreground/80 hover:bg-muted",
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          المنخفض فقط
          <span className="num">({lowCount})</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-right text-sm">
          <thead className="bg-muted/50 text-xs font-bold text-muted-foreground">
            <tr>
              <th className="px-4 py-3">المنتج</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">السعر</th>
              <th className="px-4 py-3">المخزون</th>
              <th className="px-4 py-3 text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold text-foreground">
                  {p.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground num">{p.sku}</td>
                <td className="px-4 py-3 text-muted-foreground num">
                  {formatSAR(p.price)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "num rounded-full px-2 py-0.5 text-xs font-bold",
                      p.stock <= LOW
                        ? "bg-rose-50 text-rose-700"
                        : "bg-emerald-50 text-emerald-700",
                    )}
                  >
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-3 text-left">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActive(p)}
                  >
                    تسجيل حركة
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  لا نتائج مطابقة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-extrabold text-foreground">
          سجل حركات المخزون
        </h2>
        {stockMovements.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            لا توجد حركات مخزون بعد.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {stockMovements.slice(0, 30).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {m.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.reason} •{" "}
                    <span className="num" dir="ltr">
                      {new Date(m.at).toLocaleString("ar-SA")}
                    </span>
                  </p>
                </div>
                <span
                  className={cn(
                    "num rounded-full px-2 py-0.5 text-xs font-bold",
                    m.delta >= 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700",
                  )}
                >
                  {m.delta > 0 ? "+" : ""}
                  {m.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={!!active}
        onOpenChange={(o) => {
          if (!o) {
            setActive(null);
            setDelta("");
            setReason("استلام مخزون");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>تسجيل حركة مخزون</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-sm font-bold text-foreground">
                    {active.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    المخزون الحالي:{" "}
                    <span className="num font-bold text-foreground">
                      {active.stock}
                    </span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qty">الكمية</Label>
                  <Input
                    id="qty"
                    type="number"
                    min={1}
                    value={delta}
                    onChange={(e) => setDelta(e.target.value)}
                    placeholder="مثال: 10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reason">السبب</Label>
                  <Input
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="مثال: استلام مخزون / تلف / جرد"
                  />
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2 sm:justify-start">
                <Button onClick={() => submit(1)} className="gap-1">
                  <Plus className="h-4 w-4" />
                  زيادة
                </Button>
                <Button
                  variant="outline"
                  onClick={() => submit(-1)}
                  className="gap-1"
                >
                  <Minus className="h-4 w-4" />
                  خصم
                </Button>
                <Button variant="ghost" onClick={() => setActive(null)}>
                  إلغاء
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
