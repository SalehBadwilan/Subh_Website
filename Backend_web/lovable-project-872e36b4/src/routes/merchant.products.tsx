import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Send, Package as PackageIcon } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatSAR, type MerchantProduct } from "@/lib/merchant-data";
import { useMerchantStore } from "@/lib/merchant-store";
import { useAdminStore } from "@/lib/admin-store";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/products")({
  head: () => ({ meta: [{ title: "منتجاتي — صبح تاجر" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const { currentMerchantId } = useMerchantStore();
  const { catalog, categories } = useAdminStore();

  const products = useMemo<MerchantProduct[]>(() => {
    if (!currentMerchantId) return [];
    return catalog
      .filter(
        (p) => p.active && p.assignedMerchantIds.includes(currentMerchantId),
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category:
          categories.find((c) => c.id === p.categoryId)?.name ?? p.categoryId,
        price: p.price,
        stock: p.stock,
        lowStockThreshold: Math.max(5, Math.round(p.stock * 0.1)),
        sold30d: 0,
      }));
  }, [catalog, categories, currentMerchantId]);

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MerchantProduct | null>(null);
  const [updateFor, setUpdateFor] = useState<MerchantProduct | null>(null);
  const [note, setNote] = useState("");

  const list = products.filter(
    (p) =>
      !q ||
      p.name.includes(q) ||
      p.sku.toLowerCase().includes(q.toLowerCase()) ||
      p.category.includes(q),
  );

  function submitUpdate() {
    toast.success("تم إرسال طلب التحديث إلى إدارة صبح للمراجعة.");
    setUpdateFor(null);
    setNote("");
  }

  if (products.length === 0) {
    return (
      <MerchantPage
        title="المنتجات"
        subtitle="المنتجات المعيّنة إليك من إدارة صبح. لا يمكنك إضافة منتجات مباشرة."
      >
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <PackageIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-foreground">
            لا توجد منتجات مسندة لحسابك حتى الآن.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            سيقوم فريق إدارة صبح بتعيين المنتجات إلى حسابك قريبًا.
          </p>
        </div>
      </MerchantPage>
    );
  }

  return (
    <MerchantPage
      title="المنتجات"
      subtitle="المنتجات المعيّنة إليك من إدارة صبح. لا يمكنك إضافة منتجات مباشرة."
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم المنتج أو الرمز أو الفئة"
            className="h-11 rounded-full pr-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-[1fr,140px,100px,110px,110px,160px] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-bold text-muted-foreground md:grid">
          <span>المنتج</span>
          <span>الرمز</span>
          <span>الفئة</span>
          <span className="text-left">السعر</span>
          <span className="text-left">المخزون</span>
          <span className="text-left">إجراءات</span>
        </div>
        {list.map((p) => (
          <div
            key={p.id}
            className="grid gap-3 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1fr,140px,100px,110px,110px,160px] md:items-center"
          >
            <div className="min-w-0 flex items-center gap-3">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-primary"
                style={{ background: `hsl(${hashHue(p.id)} 80% 95%)` }}
              >
                <PackageIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground md:hidden num">
                  {p.sku} • {p.category}
                </p>
              </div>
            </div>
            <span className="hidden text-xs font-semibold text-muted-foreground num md:block">{p.sku}</span>
            <span className="hidden text-xs font-semibold text-muted-foreground md:block">{p.category}</span>
            <span className="hidden text-sm font-bold text-foreground num md:block">{formatSAR(p.price)}</span>
            <span className="hidden md:block">
              <StockPill stock={p.stock} threshold={p.lowStockThreshold} />
            </span>
            <div className="flex flex-wrap items-center justify-between gap-2 md:justify-start">
              <div className="flex items-center gap-2 md:hidden">
                <span className="text-sm font-bold text-foreground num">{formatSAR(p.price)}</span>
                <StockPill stock={p.stock} threshold={p.lowStockThreshold} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(p)}>
                  عرض
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setUpdateFor(p)}>
                  طلب تحديث
                </Button>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            لا توجد منتجات مطابقة.
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription className="num">{selected?.sku}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Row label="الفئة" value={selected.category} />
              <Row label="السعر" value={formatSAR(selected.price)} mono />
              <Row label="المخزون الحالي" value={`${selected.stock}`} mono />
              <Row label="حد التنبيه" value={`${selected.lowStockThreshold}`} mono />
              <Row label="المباع خلال ٣٠ يوم" value={`${selected.sold30d}`} mono />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!updateFor} onOpenChange={(o) => !o && setUpdateFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طلب تحديث المنتج</DialogTitle>
            <DialogDescription>
              اكتب تفاصيل التحديث المطلوب على المنتج <b>{updateFor?.name}</b>. سيتم إرسال طلبك لإدارة صبح للمراجعة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="note">وصف التحديث</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: تحديث الوصف، تعديل الصور، تحديث السعر…"
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateFor(null)}>
              إلغاء
            </Button>
            <Button onClick={submitUpdate} disabled={!note.trim()}>
              <Send className="h-4 w-4" />
              إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MerchantPage>
  );
}

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function StockPill({ stock, threshold }: { stock: number; threshold: number }) {
  const tone =
    stock === 0
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : stock <= threshold
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold num", tone)}>
      {stock === 0 ? "نفد" : stock}
    </span>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-bold text-foreground", mono && "num")}>{value}</span>
    </div>
  );
}
