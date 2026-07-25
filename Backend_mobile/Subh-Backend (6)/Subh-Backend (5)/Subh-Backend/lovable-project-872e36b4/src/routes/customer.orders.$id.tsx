import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  CreditCard,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import {
  orderStatusLabels,
  paymentMethodLabels,
  type Order,
  type Product,
} from "@/lib/customer-data";
import { useAppStore } from "@/lib/app-store";
import { useRequireAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/orders/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `طلب ${params.id} — صبح` },
      { name: "description", content: `تفاصيل طلبك ${params.id} على صبح.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetails,
  notFoundComponent: OrderNotFound,
});

const stages: { key: Order["status"]; label: string }[] = [
  { key: "processing", label: "تجهيز الطلب" },
  { key: "shipped", label: "في الطريق" },
  { key: "delivered", label: "تم التوصيل" },
];

function OrderDetails() {
  const ready = useRequireAuth();
  const { id } = Route.useParams();
  const { getOrderById } = useAppStore();
  if (!ready) return null;
  const order = getOrderById(id);
  if (!order) return <OrderNotFound />;
  const currentIndex =
    order.status === "cancelled" ? -1 : stages.findIndex((s) => s.key === order.status);

  return (
    <PageContainer>
      <Link
        to="/customer/orders"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        كل الطلبات
      </Link>
      <PageHeader
        title={<span className="num">طلب {order.id}</span>}
        subtitle={<span className="num" dir="ltr">{order.date}</span>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">حالة الطلب</h2>
            {order.status === "cancelled" ? (
              <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                تم إلغاء هذا الطلب.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {stages.map((s, i) => {
                  const done = i <= currentIndex;
                  const Icon = i === 0 ? Package : i === 1 ? Truck : CheckCircle2;
                  return (
                    <li key={s.key} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-full",
                          done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {done ? <Icon className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          done ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold text-foreground">
              المنتجات (<span className="num">{order.items.length}</span>)
            </h2>
            <ul className="space-y-3">
              {order.items.map(({ product, qty }: { product: Product; qty: number }) => (
                <li key={product.id} className="flex items-center gap-3">
                  <Link
                    to="/customer/product/$id"
                    params={{ id: product.id }}
                    className="aspect-square w-16 shrink-0 overflow-hidden rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, oklch(0.92 0.06 ${product.hue}), oklch(0.82 0.09 ${product.hue}))`,
                    }}
                    aria-label={product.name}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/customer/product/$id"
                      params={{ id: product.id }}
                      className="line-clamp-1 text-sm font-bold text-foreground hover:text-primary"
                    >
                      {product.name}
                    </Link>
                    <div className="num mt-1 text-xs text-muted-foreground">
                      الكمية: {qty}
                    </div>
                  </div>
                  <div className="num text-sm font-black text-foreground">
                    {product.price * qty} ر.س
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              عنوان التوصيل
            </h2>
            {order.delivery ? (
              <div className="space-y-0.5 text-xs text-muted-foreground">
                <p className="text-sm font-semibold text-foreground">
                  {order.delivery.label} · {order.delivery.recipient}
                </p>
                <p className="num" dir="ltr">
                  {order.delivery.phone}
                </p>
                <p>
                  {order.delivery.city} — {order.delivery.district}
                </p>
                <p>{order.delivery.street}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">لا يوجد عنوان مسجّل لهذا الطلب.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <CreditCard className="h-4 w-4 text-primary" />
              طريقة الدفع
            </h2>
            <p className="text-sm font-semibold text-foreground">
              {order.payment ? paymentMethodLabels[order.payment] : "غير محدّدة"}
            </p>
          </section>
        </div>

        <aside className="h-fit space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">ملخّص الفاتورة</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <Row label="رقم الطلب" value={<span className="num">{order.id}</span>} />
              <Row label="تاريخ الطلب" value={<span className="num" dir="ltr">{order.date}</span>} />
              <Row label="حالة الطلب" value={orderStatusLabels[order.status]} />
              <Row label="عدد المنتجات" value={<span className="num">{order.itemCount}</span>} />
              <div className="my-2 border-t border-border" />
              <Row label="الإجمالي" value={<span className="num">{order.total} ر.س</span>} bold />
            </dl>
          </section>
          <Button asChild variant="outline" className="w-full rounded-full">
            <Link to="/customer/support">تواصل مع الدعم</Link>
          </Button>
        </aside>
      </div>
    </PageContainer>
  );
}

function Row({ label, value, bold }: { label: string; value: ReactNode; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className={cn("text-muted-foreground", bold && "font-bold text-foreground")}>{label}</dt>
      <dd className={cn("font-semibold text-foreground", bold && "text-lg font-black")}>{value}</dd>
    </div>
  );
}

function OrderNotFound() {
  return (
    <PageContainer>
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <h1 className="text-xl font-bold text-foreground">الطلب غير موجود</h1>
        <Link
          to="/customer/orders"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى طلباتي
        </Link>
      </div>
    </PageContainer>
  );
}
