import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCcw, Warehouse, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ApiRequestError } from "@/lib/api";
import { getMerchantInventory, updateInventory, type ApiInventory } from "@/lib/api-merchant";

export const Route = createFileRoute("/merchant/inventory")({
  head: () => ({ meta: [{ title: "المخزون — صبح تاجر" }] }),
  component: InventoryPage,
});

type LoadStatus = "loading" | "success" | "error";

function InventoryPage() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [rows, setRows] = useState<ApiInventory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    // Real backend call: GET /api/inventory (stock rows are SKU-scoped;
    // the training backend keeps one central inventory for the platform).
    getMerchantInventory()
      .then((inv) => {
        setRows(inv);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب المخزون.");
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

  async function saveOnHand(row: ApiInventory) {
    const raw = draft[row.id];
    const value = Number.parseInt(raw ?? "", 10);
    if (!Number.isFinite(value) || value < 0 || value === row.on_hand) return;
    setBusyId(row.id);
    try {
      // Real backend call: PUT /api/inventory/:id
      const updated = await updateInventory(row.id, {
        on_hand: row.on_hand + value,
      });
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      setDraft((d) => ({ ...d, [row.id]: "" }));
      toast.success(`تم تحديث مخزون ${row.product?.name_ar ?? row.sku}.`);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّر تحديث المخزون.");
    } finally {
      setBusyId(null);
    }
  }

  const lowCount = rows.filter((r) => r.on_hand - r.reserved <= r.reorder_threshold).length;

  return (
    <MerchantPage
      title="المخزون"
      subtitle="أرصدة المخزون الحقيقية من نظام صبح — عدّل المتوفر مباشرة"
      action={
        lowCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {lowCount} صنف تحت حد الطلب
          </span>
        ) : undefined
      }
    >
      {status === "loading" && (
        <ul className="space-y-3" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
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

      {status === "success" && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Warehouse className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">لا توجد أصناف مخزون بعد.</p>
        </div>
      )}

      {status === "success" && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((row) => {
            const available = row.on_hand - row.reserved;
            const low = available <= row.reorder_threshold;
            return (
              <li
                key={row.id}
                className={cn(
                  "flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4",
                  low ? "border-amber-300" : "border-border",
                )}
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                    low ? "bg-amber-50 text-amber-600" : "bg-primary-soft text-primary",
                  )}
                >
                  <Warehouse className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="num text-sm font-bold text-foreground">
                    {row.product?.name_ar ?? row.sku}
                  </p>
                  <p className="num mt-0.5 text-xs text-muted-foreground">
                    متوفر: {available} · محجوز: {row.reserved} · حد الطلب: {row.reorder_threshold}
                  </p>
                  {low && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      المخزون منخفض
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={draft[row.id] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                    placeholder={String(row.on_hand)}
                    className="num h-10 w-24 rounded-xl text-center"
                    aria-label={`الكمية الجديدة لـ ${row.product?.name_ar ?? row.sku}`}
                  />
                  <Button
                    size="sm"
                    className="rounded-full"
                    disabled={busyId === row.id || !(draft[row.id] ?? "").trim()}
                    onClick={() => saveOnHand(row)}
                  >
                    حفظ
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </MerchantPage>
  );
}
