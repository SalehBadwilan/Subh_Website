import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { orderStatusLabels, type Order } from "@/lib/customer-data";
import { useAppStore } from "@/lib/app-store";
import { useRequireAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/orders/")({
  head: () => ({
    meta: [
      { title: "طلباتي — صبح" },
      { name: "description", content: "جميع طلباتك على صبح في مكان واحد." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

const statusTone: Record<Order["status"], string> = {
  processing: "bg-amber-50 text-amber-700",
  shipped: "bg-sky-50 text-sky-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
};

function OrdersPage() {
  const ready = useRequireAuth();
  const { orders } = useAppStore();
  if (!ready) return null;

  if (orders.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="طلباتي" />
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-bold text-foreground">
            لا توجد طلبات حتى الآن
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            عندما تُنشئ طلبك الأول، سيظهر هنا مباشرةً.
          </p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/customer">ابدأ التسوّق</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="طلباتي" subtitle="سجلّ طلباتك على صبح" />

      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              to="/customer/orders/$id"
              params={{ id: o.id }}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:shadow-soft"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num text-sm font-bold text-foreground">{o.id}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      statusTone[o.status],
                    )}
                  >
                    {orderStatusLabels[o.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="num" dir="ltr">{o.date}</span> · {o.itemCount} منتج
                </p>
              </div>
              <div className="text-left">
                <div className="num text-base font-black text-foreground">
                  {o.total} <span className="text-xs font-bold">ر.س</span>
                </div>
                <ChevronLeft className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
