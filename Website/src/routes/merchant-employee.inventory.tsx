import { createFileRoute } from "@tanstack/react-router";

import {
  AlertTriangle,
  Package as PackageIcon,
  Warehouse,
  XCircle,
} from "lucide-react";
import {
  MerchantEmployeePage,
  EmptyState,
} from "@/components/merchant-employee/MerchantEmployeeShell";
import { useEffect, useState } from "react";
import {
  getEmployeeInventory,
  updateInventory,
  type ApiInventory,
} from "@/lib/api-merchant";

import { useMerchantStore } from "@/lib/merchant-store";

import { cn } from "@/lib/utils";


export const Route = createFileRoute("/merchant-employee/inventory")({
  head: () => ({ meta: [{ title: "المخزون — موظف تاجر" }] }),
  component: EmployeeInventoryPage,
});

const LOW_THRESHOLD = 10;
function EmployeeInventoryPage() {
  const { currentMerchantId } = useMerchantStore();

  const [items, setItems] = useState<ApiInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ApiInventory | null>(null);
const [quantityToAdd, setQuantityToAdd] = useState("");
const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getEmployeeInventory()
        console.log("Inventory API:", data);
setItems(data);
        setItems(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  console.log("currentMerchantId:", currentMerchantId);

  if (loading) {
    return (
  <MerchantEmployeePage
    title="المخزون"
    subtitle="جاري تحميل المخزون..."
  >
    <></>
  </MerchantEmployeePage>
);
  }

  if (items.length === 0) {
    return (
      <MerchantEmployeePage
        title="المخزون"
        subtitle="اعرض مستويات المخزون والتنبيهات."
      >
        <EmptyState
          icon={Warehouse}
          title="لا يوجد مخزون حالياً."
          description="سيظهر المخزون فور تعيين منتجات إلى متجرك."
        />
      </MerchantEmployeePage>
    );
  }

  const inStock = items.filter(
    (p) => p.available > p.reorder_threshold,
  );

  const low = items.filter(
    (p) =>
      p.available > 0 &&
      p.available <= p.reorder_threshold,
  );

  const out = items.filter(
    (p) => p.available <= 0,
  );

  return (
    <MerchantEmployeePage
      title="المخزون"
      subtitle="اعرض مستويات المخزون والتنبيهات."
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          tone="emerald"
          icon={PackageIcon}
          label="متوفر"
          count={inStock.length}
        />
        <SummaryCard
          tone="amber"
          icon={AlertTriangle}
          label="مخزون منخفض"
          count={low.length}
        />
        <SummaryCard
          tone="rose"
          icon={XCircle}
          label="نفد"
          count={out.length}
        />
      </div>

      <Section
  title="مخزون منخفض"
  items={low}
  emptyText="لا توجد منتجات بمخزون منخفض."
  onAddStock={(item) => {
    setEditingItem(item);
    setQuantityToAdd("");
  }}
/>

      <div className="h-4" />

      <Section
  title="نفدت من المخزون"
  items={out}
  emptyText="جميع المنتجات متوفرة."
  onAddStock={(item) => {
    setEditingItem(item);
    setQuantityToAdd("");
  }}
/>

      <div className="h-4" />

      <Section
  title="المخزون الكامل"
  items={items}
  emptyText="لا توجد منتجات."
  showAll
  onAddStock={(item) => {
    setEditingItem(item);
    setQuantityToAdd("");
  }}
/>
      {editingItem && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

      <h2 className="mb-4 text-xl font-bold">
        إضافة للمخزون
      </h2>

      <p className="mb-2">
        {editingItem.product?.name_ar}
      </p>

      <p className="mb-4 text-sm text-gray-500">
        الكمية الحالية: {editingItem.on_hand}
      </p>

      <input
  type="number"
  min={1}
  value={quantityToAdd}
  onChange={(e) => setQuantityToAdd(e.target.value)}
  className="mb-4 w-full rounded-lg border p-2"
/>

      <div className="flex justify-end gap-2">

        <button
          onClick={() => setEditingItem(null)}
          className="rounded-lg border px-4 py-2"
        >
          إلغاء
        </button>

        <button
  disabled={saving}
  onClick={async () => {
    try {
      setSaving(true);

      const quantity = Number(quantityToAdd);

      if (!quantity || quantity <= 0) {
        alert("أدخل كمية صحيحة");
        setSaving(false);
        return;
      }

      await updateInventory(editingItem.id, {
        on_hand: editingItem.on_hand + quantity,
      });

      const data = await getEmployeeInventory();

      setItems(data);
      setEditingItem(null);
      setQuantityToAdd("");

    } catch (err) {
      console.error(err);
      alert("فشل تحديث المخزون");
    } finally {
      setSaving(false);
    }
  }}
  className="rounded-lg bg-emerald-600 px-4 py-2 text-white"
>
  {saving ? "جارٍ الحفظ..." : "حفظ"}
</button>
      </div>
    </div>
  </div>
)}
    </MerchantEmployeePage>
  );
}


function SummaryCard({
  tone,
  icon: Icon,
  label,
  count,
}: {
  tone: "emerald" | "amber" | "rose";
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  count: number;
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <span
        className={cn(
          "grid h-12 w-12 place-items-center rounded-xl",
          tones[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="text-2xl font-extrabold text-foreground num">{count}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  emptyText,
  showAll,
  onAddStock,
}: {
  title: string;
  items: ApiInventory[];
  emptyText: string;
  showAll?: boolean;
  onAddStock: (item: ApiInventory) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-extrabold text-foreground">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((p) => {
            const pct = Math.min(
  100,
  (p.available / Math.max(p.reorder_threshold * 4, 1)) * 100,
);
            const barTone =
              p.available === 0
                ? "bg-rose-500"
                : p.available <= LOW_THRESHOLD
                  ? "bg-amber-500"
                  : "bg-emerald-500";
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {p.product?.name_ar ?? "منتج"}
                  </p>
                  
                  {showAll && (
                    <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full", barTone)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">المتوفر</p>
                  <p className="text-lg font-extrabold text-foreground num">
  {p.available}
</p>
<button
  onClick={() => onAddStock(p)}
  className="mt-2 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
>
  إضافة للمخزون
</button>

                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
